#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-only
"""The second engine: SLAM's money math worked out a second time, in another language, by other routes.

It reads the cases tools/audit/cases.mjs wrote (inputs plus SLAM's answers), works every answer out again and lists
each number that differs by more than a dollar. Where a textbook formula exists it is used here even when SLAM steps
month by month (and the other way round), so the two engines only agree when both are right. The law's numbers that
SLAM keeps in code (not in data/reference-2026.json) are typed in again here from their sources.

Usage: python3 tools/audit/engine2.py <cases.json> <reference-2026.json> [report.json]
"""
import json, math, sys
from collections import defaultdict

TOL = 1.0  # dollars
TAX_STOP, TAX_ROUNDS, CREDIT_ROUNDS = 0.5, 40, 30

# ---------- the law, typed in a second time ----------
# IRS Rev. Proc. 2025-32, section 4.01: the tax printed at the bottom of each bracket, tax year 2026.
IRS_PRINTED = {
    'single': [(12400, 1240), (50400, 5800), (105700, 17966), (201775, 41024), (256225, 58448), (640600, 192979.25)],
    'joint': [(24800, 2480), (100800, 11600), (211400, 35932), (403550, 82048), (512450, 116896), (768700, 206583.50)],
    'head': [(17700, 1770), (67450, 7740), (105700, 16155), (201750, 39207), (256200, 56631), (640600, 191171)],
}
SS_LINES = {'single': (25000, 34000), 'joint': (32000, 44000)}           # 26 U.S.C. 86, not indexed
GAIN_LINES = {'single': (49450, 545500), 'joint': (98900, 613700), 'head': (66200, 579600)}  # Rev. Proc. 2025-32
UNIFORM = dict(zip(range(73, 101), [26.5, 25.5, 24.6, 23.7, 22.9, 22.0, 21.1, 20.2, 19.4, 18.5, 17.7, 16.8, 16.0, 15.2, 14.4,
                                    13.7, 12.9, 12.2, 11.5, 10.8, 10.1, 9.5, 8.9, 8.4, 7.8, 7.3, 6.8, 6.4]))  # Pub. 590-B, Table III
POVERTY_ONE, POVERTY_EACH = 15650, 5500                                   # 2025 HHS guideline, 48 states
ACA = [(1.33, .0210, .0210), (1.50, .0314, .0419), (2.00, .0419, .0660), (2.50, .0660, .0844), (3.00, .0844, .0996), (4.00, .0996, .0996)]  # Rev. Proc. 2025-25
IRMAA_2026 = [(109000, 218000, 81.20, 14.50), (137000, 274000, 202.90, 37.50), (171000, 342000, 324.60, 60.40), (205000, 410000, 446.30, 83.30), (500000, 750000, 487.00, 91.00)]


def key_of(status):
    return 'joint' if status in ('Married jointly', 'joint') else 'head' if status in ('Head of household', 'head') else 'single'


def stepped(amount, table):
    """Tax on `amount` from a list of [floor, rate] rows, lowest first."""
    tax, top_rate = 0.0, table[0][1]
    for i, (floor, rate) in enumerate(table):
        if amount <= floor:
            break
        ceiling = table[i + 1][0] if i + 1 < len(table) else math.inf
        tax += (min(amount, ceiling) - floor) * rate
        top_rate = rate
    return tax, top_rate


class Law:
    def __init__(self, ref):
        self.ref, self.t = ref, ref['tax']

    def federal(self, gross, pretax=0, status='Single', se_half=0):
        k = key_of(status)
        taxable = max(0.0, gross - pretax - se_half - self.t['standardDeduction'][k])
        tax, rate = stepped(taxable, self.t['brackets'][k])
        return tax, taxable, rate

    def payroll(self, gross, status='Single', self_employed=False):
        t, k = self.t, key_of(status)
        if self_employed:
            net = gross * 0.9235
            oasdi = min(net, t['socialSecurityWageBase']) * 0.124
            hospital = net * 0.029
            extra = max(0.0, net - t['additionalMedicareOver'][k]) * 0.009
            return oasdi + hospital + extra, oasdi, hospital + extra, (oasdi + hospital) / 2
        oasdi = min(gross, t['socialSecurityWageBase']) * 0.062
        hospital = gross * 0.0145 + max(0.0, gross - t['additionalMedicareOver'][k]) * 0.009
        return oasdi + hospital, oasdi, hospital, 0.0

    def state(self, gross, pretax=0, status='Single', place=None):
        if not place or not place.get('state') or place['state'] not in self.t.get('state', {}):
            return 0.0, 0.0
        st, k = self.t['state'][place['state']], key_of(status)
        taxable = max(0.0, gross - pretax - st['standardDeduction'][k])
        city = stepped(taxable, self.t['local']['NYC']['brackets'][k])[0] if place.get('nyc') else 0.0
        return stepped(taxable, st['brackets'][k])[0], city

    def take_home(self, gross, pretax=0, roth=0, status='Single', self_employed=False, place=None):
        pay, _, _, half = self.payroll(gross, status, self_employed)
        fed = self.federal(gross, pretax, status, half)[0]
        st, city = self.state(gross, pretax, status, place)
        return gross - fed - pay - st - city - pretax - roth

    # ----- the free years -----
    def taxed_ss(self, ss, other, status):
        if ss <= 0:
            return 0.0
        first, second = SS_LINES['joint' if status == 'Married jointly' else 'single']
        provisional = other + ss / 2
        if provisional <= first:
            return 0.0
        half_band = min(ss / 2, (provisional - first) / 2)
        if provisional <= second:
            return half_band
        return min(0.85 * ss, 0.85 * (provisional - second) + min(ss / 2, (second - first) / 2))

    @staticmethod
    def gains_tax(gains, ordinary_taxable, k):
        if gains <= 0:
            return 0.0
        zero_top, fifteen_top = GAIN_LINES.get(k, GAIN_LINES['single'])
        lo = max(0.0, ordinary_taxable)
        hi = lo + gains
        in15 = max(0.0, min(hi, fifteen_top) - max(lo, zero_top))
        in20 = max(0.0, hi - max(lo, fifteen_top))
        return 0.15 * in15 + 0.20 * in20

    def year_tax(self, ordinary, ss, gains, tax):
        status = tax.get('filingStatus', 'Single')
        k = 'joint' if status == 'Married jointly' else 'head' if status == 'Head of household' else 'single'
        gross = ordinary + self.taxed_ss(ss, ordinary + gains, status)
        if gross + gains <= 0:
            return 0.0
        fed = self.federal(gross, 0, status)[0] if gross > 0 else 0.0
        st, city = self.state(ordinary + gains, 0, status, tax.get('place'))
        std = self.t['standardDeduction'][k]
        unused = max(0.0, std - gross)
        return fed + self.gains_tax(max(0.0, gains - unused), max(0.0, gross - std), k) + st + city

    def irmaa(self, magi, status):
        col = 1 if status == 'Married jointly' else 0
        hit = [row for row in IRMAA_2026 if magi > row[col]]
        return (hit[-1][2] + hit[-1][3]) * 12 if hit else 0.0

    def fill_line(self, fill, tax):
        if not fill or fill == 'none':
            return 0.0
        status = tax.get('filingStatus', 'Single')
        k = 'joint' if status == 'Married jointly' else 'head' if status == 'Head of household' else 'single'
        std = self.t['standardDeduction'][k]
        if fill == 'deduction':
            return std
        above = [floor for floor, rate in self.t['brackets'][k] if rate > int(fill) / 100 + 1e-9]
        return std + (above[0] if above else 0)


def rmd(age, pretax, start=73):
    if age < start or pretax <= 0:
        return 0.0
    return pretax / UNIFORM[min(100, age)]


def premium_credit(income, benchmark, people=1):
    if benchmark <= 0:
        return 0.0
    ratio = income / (POVERTY_ONE + POVERTY_EACH * (people - 1))
    if ratio < 1 or ratio > 4:
        return 0.0
    low = 1.0
    for top, a, b in ACA:
        if ratio <= top:
            share = a + (b - a) * (ratio - low) / (top - low)
            return max(0.0, benchmark - income * share)
        low = top
    return 0.0


# ---------- debt ----------
def one_debt(balance, apr, payment):
    r = apr / 12
    out = {'never': False, 'paymentNeeded': None}
    if r == 0:
        exact = balance / payment
        out.update(months=math.ceil(exact - 1e-9), exact=exact, formula_interest=0.0)
    elif payment <= r * balance:
        return {'never': True, 'months': None, 'exact': None, 'paymentNeeded': math.floor(balance * r) + 1, 'formula_interest': None, 'true_interest': None}
    else:
        exact = -math.log(1 - r * balance / payment) / math.log(1 + r)  # the amortization formula
        out.update(months=math.ceil(exact - 1e-9), exact=exact, formula_interest=exact * payment - balance)
    # what is really paid: step every month, the last payment only what is left
    b, paid = balance, 0.0
    for _ in range(2400):
        if b <= 0.005:
            break
        b *= 1 + r
        p = min(payment, b)
        b -= p
        paid += p
    out['true_interest'] = paid - balance
    return out


def debt_plan(debts, extra, order):
    ranked = sorted(range(len(debts)), key=(lambda i: -debts[i]['apr']) if order == 'avalanche' else (lambda i: debts[i]['balance']))
    left = [d['balance'] for d in debts]
    gone = [None] * len(debts)
    budget = sum(d['payment'] for d in debts) + extra
    interest = 0.0
    for month in range(1, 1201):
        spare = budget
        for i, d in enumerate(debts):
            if left[i] <= 0.005:
                continue
            charge = left[i] * d['apr'] / 12
            interest += charge
            left[i] += charge
            p = min(left[i], d['payment'])
            left[i] -= p
            spare -= p
        for i in ranked:
            if left[i] > 0.005 and spare > 0:
                p = min(left[i], spare)
                left[i] -= p
                spare -= p
        for i in range(len(debts)):
            if left[i] <= 0.005 and gone[i] is None:
                gone[i] = month
        if all(v <= 0.005 for v in left):
            return {'months': month, 'interest': interest, 'each': {debts[i]['name']: gone[i] for i in range(len(debts))}}
    return {'months': None, 'interest': interest, 'each': {debts[i]['name']: gone[i] for i in range(len(debts))}}


# ---------- FI ----------
def months_to(invested, monthly, yearly_return, target, cap=840):
    """Smallest whole number of months for B*g^n + P*(g^n - 1)/(g - 1) to reach the target (closed form, then checked)."""
    if invested >= target:
        return 0
    g = (1 + yearly_return) ** (1 / 12)
    value = lambda n: invested * g ** n + monthly * (g ** n - 1) / (g - 1)
    if value(cap) < target:
        return None
    k = monthly / (g - 1)
    n = max(0, math.ceil(math.log((target + k) / (invested + k)) / math.log(g)) - 2)
    while value(n) < target:
        n += 1
    return n


# ---------- the whole life ----------
def take_out(b, amount, age):
    """Take `amount` from the buckets, cheapest first. Returns (pretax taken, penalty, gains, short)."""
    left = amount
    pretax = penalty = gains = early_growth = 0.0

    def take(name, cap=math.inf):
        nonlocal left
        v = min(left, max(0.0, min(b[name], cap)))
        b[name] -= v
        left -= v
        return v

    had = b['taxable']
    sold = take('taxable')
    if sold > 0 and had > 0:
        basis_share = min(1.0, max(0.0, b['basis'] / had))
        gains = sold * (1 - basis_share)
        b['basis'] = max(0.0, b['basis'] - sold * basis_share)
    if age < 60:
        free = take('roth', b['rothFree'])
        b['rothFree'] -= free
        p = take('pretax')
        pretax += p
        penalty += 0.10 * p
        early_growth = take('roth')
        penalty += 0.10 * early_growth
    else:
        pretax += take('pretax')
        b['rothFree'] = max(0.0, b['rothFree'] - take('roth'))
    return pretax, penalty, gains, early_growth, (left if left > 0.5 else 0.0)


def whole_life(x, law, audit=None):
    s = x['start']
    b = {'taxable': s.get('taxable') or 0.0, 'pretax': s.get('pretax') or 0.0, 'roth': s.get('roth') or 0.0}
    b['rothFree'] = min(s.get('rothFree') or 0.0, b['roth'])
    b['basis'] = min(s['basis'] if s.get('basis') is not None else b['taxable'], b['taxable'])
    partner = x.get('partner')
    gap = (partner['age'] - x['age']) if partner else 0
    last_age = x['planAge'] + (max(0, -gap) if partner else 0)
    partner_ss = (partner.get('ss') or {}).get('yearly', 0) if partner else 0
    people = 2 if partner else 1
    tax = x.get('tax') or {'filingStatus': 'Single'}
    status = tax.get('filingStatus', 'Single')
    line = law.fill_line(tax.get('fill'), tax)
    health = tax.get('health') or 0
    own_ss = (x.get('ss') or {}).get('yearly', 0) or 0
    claim = (x.get('ss') or {}).get('claimAge') or 200
    blocks = x.get('blocks') or []
    eras = x.get('eras') or {}
    strategy = x.get('strategy') or {'id': 'fixed'}
    total = lambda: b['taxable'] + b['pretax'] + b['roth']
    waiting_conversions, income_by_year, rows, held = [], {}, [], []
    at_retire = ran_out = first_rate = None
    life_tax = penalties = surcharges = 0.0
    lowest, trim = 1.0, 1.0

    def under_65(age):
        return (1 if age < 65 else 0) + (1 if partner and age + gap < 65 else 0)

    def cost_of_life(age):
        share = eras.get('noGo', 1) if age >= (eras.get('noGoAge') or 200) else eras.get('slowGo', 1) if age >= (eras.get('slowGoAge') or 200) else 1
        need = x['spendingAfter'] * share + under_65(age) * health
        for blk in blocks:
            if blk['fromAge'] <= age <= blk['toAge']:
                need += blk.get('spending') or 0
            if age == blk['fromAge']:
                need += blk.get('once') or 0
        return max(0.0, need)

    k = 0
    for age in range(x['age'], last_age + 1):
        r = x['realReturn']
        for c in waiting_conversions:
            if c[0] + 5 == k:
                b['rothFree'] += c[1]
        row = dict(age=age, tax=0.0, spend=0.0, withdraw=0.0, convert=0.0, penalty=0.0, short=0.0)
        if age < x['retireAge']:
            w = x['work']
            put = dict(w['saving']) if k >= ((w.get('wait') or {}).get('years') or 0) else {'pretax': (w['wait'].get('pretax') or 0), 'roth': 0, 'taxable': 0}
            extra = 0.0
            for blk in blocks:
                if blk['fromAge'] <= age <= blk['toAge']:
                    extra += (blk.get('spending') or 0) - (blk.get('income') or 0)
                if age == blk['fromAge']:
                    extra += blk.get('once') or 0
            if extra > 0:
                for name in ('taxable', 'roth'):
                    cut = min(put[name], extra)
                    put[name] -= cut
                    extra -= cut
            elif extra < 0:
                put['taxable'] += -extra
            # a year's saving goes in a twelfth a month: by the year's end it is worth saving/12 * (g^12 - 1)/(g - 1)
            g = (1 + r) ** (1 / 12)
            part = 1.0 if r == 0 else ((g ** 12 - 1) / (g - 1) / 12) / (1 + r)
            b['taxable'] += put['taxable'] * part; b['basis'] += put['taxable']
            b['roth'] += put['roth'] * part; b['rothFree'] += put['roth']
            b['pretax'] += put['pretax'] * part
            if extra > 0.5:
                working = k >= ((w.get('wait') or {}).get('years') or 0)
                pay = max(0.0, (w.get('income') or 0) - put['pretax']) if working else 0.0
                on_pay = law.year_tax(pay, 0, 0, tax)
                due = 0.0
                for _ in range(TAX_ROUNDS):
                    got_pre, got_pen, got_gains, got_growth, _s = take_out(dict(b), extra + due, age)
                    t = law.year_tax(pay + got_pre + got_growth, 0, got_gains, tax) - on_pay + got_pen
                    if abs(t - due) < TAX_STOP:
                        due = t
                        break
                    due = t
                _, pen, _, _, short = take_out(b, extra + due, age)
                row.update(withdraw=extra + due - short, penalty=pen, tax=due - pen, short=short)
                penalties += pen
                life_tax += due - pen
        else:
            if at_retire is None:
                at_retire = total()
            start, need = total(), cost_of_life(age)
            if first_rate is None:
                first_rate = need / start if start > 0 else None
            spend = need
            if strategy['id'] == 'percent':
                spend = start * (strategy.get('rate') or 0.04)
            elif strategy['id'] == 'floor':
                spend = min(need * 1.2, max(need * 0.85, start * (strategy.get('rate') or first_rate or 0.04)))
            elif strategy['id'] == 'guardrails' and first_rate:
                now_rate = need * trim / start if start > 0 else math.inf
                if now_rate > first_rate * 1.2:
                    trim *= 0.9
                elif now_rate < first_rate * 0.8 and trim < 1.3:
                    trim *= 1.1
                trim = max(0.7, trim)
                spend = need * trim
            ss = (own_ss if age >= claim else 0) + (partner_ss if partner and age + gap >= ((partner.get('ss') or {}).get('claimAge') or 200) else 0)
            must = rmd(age, b['pretax'], x.get('rmdAge') or 73)
            benchmark = under_65(age) * health if tax.get('aca') else 0
            pt = x.get('partTime')
            earned = ((pt.get('yearly') or 0) if pt and age <= pt.get('untilAge', -1) else 0) + sum((blk.get('income') or 0) for blk in blocks if blk['fromAge'] <= age <= blk['toAge'])
            convert = min(b['pretax'], max(0.0, line - earned)) if line > 0 and b['pretax'] > 0 else 0.0
            on_medicare = (1 if age >= 65 else 0) + (1 if partner and age + gap >= 65 else 0)
            medicare = on_medicare * law.irmaa(income_by_year.get(k - 2, 0), status) if on_medicare else 0.0
            base = max(0.0, spend + medicare - ss - earned)
            def settle(credit_now, rounds):
                """This year's tax for a given credit: the tax is paid from the same buckets, so it goes round until it stops moving."""
                due_now, c, ok = 0.0, 0.0, False
                for _ in range(rounds):
                    trial = dict(b)
                    got_pre, got_pen, got_gains, got_growth, _s = take_out(trial, max(0.0, base - credit_now) + due_now, age)
                    pre = max(got_pre, min(must, b['pretax']))
                    conv = min(convert, max(0.0, b['pretax'] - pre))  # a required withdrawal comes out first; only what is left can move to Roth
                    t = law.year_tax(pre + conv + earned + got_growth, ss, got_gains, tax) + got_pen
                    c = min(benchmark, premium_credit(pre + conv + earned + got_growth + got_gains + ss, benchmark, people)) if benchmark > 0 else 0.0
                    if abs(t - due_now) < TAX_STOP:
                        due_now, ok = t, True
                        break
                    due_now = t
                return due_now, c, ok
            credit = 0.0
            due, implied, settled = settle(0.0, TAX_ROUNDS)
            for _ in range(CREDIT_ROUNDS):
                if abs(implied - credit) < 1:
                    break
                credit = implied
                due, implied, settled = settle(credit, TAX_ROUNDS)
            if abs(implied - credit) >= 1:
                # at the 400% line no credit settles: taking it lifts income past the line. Plan on none.
                credit = 0.0
                due, implied, settled = settle(0.0, TAX_ROUNDS)
                held.append([age, 'bottom' if implied >= 1 else 'top'])
            base = max(0.0, base - credit)
            pre_out, pen, gains, growth_out, short = take_out(b, base + due, age)
            forced = min(b['pretax'], max(0.0, must - pre_out))
            if forced > 0:
                b['pretax'] -= forced; b['taxable'] += forced; b['basis'] += forced
            conv = min(convert, max(0.0, b['pretax']))
            b['pretax'] -= conv; b['roth'] += conv
            if conv > 0:
                waiting_conversions.append((k, conv))
            ordinary_out = pre_out + forced + conv + earned + growth_out
            income_by_year[k] = ordinary_out + gains + law.taxed_ss(ss, ordinary_out + gains, status)
            if audit is not None:
                # what this year's income really owes, against what was set aside for it
                owed = law.year_tax(ordinary_out, ss, gains, tax) + pen
                real_credit = min(benchmark, premium_credit(ordinary_out + gains + ss, benchmark, people)) if benchmark > 0 else 0.0
                audit.append({'age': age, 'settled': settled, 'tax_gap': due - owed, 'credit_gap': credit - real_credit, 'short': short})
            row.update(spend=max(0.0, spend - short) if short else spend, tax=due - pen, withdraw=base + due - short, convert=conv, penalty=pen, short=short)
            life_tax += due - pen
            penalties += pen
            surcharges += medicare
            if need > 0:
                lowest = min(lowest, row['spend'] / need)
        if row['short'] > 0.5 and ran_out is None:
            ran_out = age
        for name in ('taxable', 'pretax', 'roth'):
            b[name] *= 1 + r
        b['rothFree'] = min(b['rothFree'], b['roth'])
        b['basis'] = min(b['basis'], b['taxable'])
        rows.append([age, total(), row['tax'], row['spend'], row['withdraw'], row['convert'], row['penalty'], row['short'], b['taxable'], b['pretax'], b['roth']])
        k += 1
    return {'ok': ran_out is None, 'ranOutAge': ran_out, 'atRetire': at_retire if at_retire is not None else total(), 'end': total(), 'lifetimeTax': life_tax,
            'penalties': penalties, 'surcharges': surcharges, 'lowestSpend': lowest, 'years': rows, 'creditHeld': held}


# ---------- compare ----------
class Report:
    def __init__(self):
        self.by = defaultdict(lambda: {'cases': 0, 'checks': 0, 'off': 0, 'worst': 0.0, 'example': None})
        self.notes = defaultdict(list)

    def check(self, fn, name, theirs, mine, case, tol=TOL):
        row = self.by[fn]
        row['checks'] += 1
        if theirs is None and mine is None:
            return True
        if isinstance(theirs, bool) or isinstance(mine, bool):
            same, diff = theirs == mine, 0 if theirs == mine else math.inf
        elif theirs is None or mine is None:
            same, diff = False, math.inf
        else:
            diff = abs(theirs - mine)
            same = diff <= max(tol, 1e-9 * max(abs(theirs), abs(mine)))
        if not same:
            row['off'] += 1
            if diff > row['worst'] or row['example'] is None:
                row['worst'] = diff if diff != math.inf else row['worst']
                row['example'] = {'what': name, 'slam': theirs, 'second': mine, 'input': case['input']}
        return same


def run(cases, ref):
    law, R = Law(ref), Report()
    extra = {'interest_gap': [], 'pace': [], 'life': {'runs': 0, 'years': 0, 'unsettled_years': 0, 'tax_gap_years': 0, 'worst_tax_gap': 0.0, 'worst_tax_case': None, 'credit_gap_years': 0, 'worst_credit_gap': 0.0, 'runs_touched': 0}}
    wr, rr = ref['presets']['withdrawalRate']['default'], ref['presets']['realReturn']['default']
    for c in cases:
        fn, x, o = c['fn'], c['input'], c['output']
        R.by[fn]['cases'] += 1
        ck = lambda name, theirs, mine, tol=TOL: R.check(fn, name, theirs, mine, c, tol)
        if fn == 'federalTax':
            tax, taxable, rate = law.federal(x['gross'], x['pretax'], x['filingStatus'])
            ck('tax', o['tax'], tax); ck('taxable income', o['taxable'], taxable); ck('top rate', o['marginal'], rate, 1e-9)
        elif fn == 'fica':
            total, ss, med, half = law.payroll(x['gross'], x['filingStatus'], x['selfEmployed'])
            ck('total', o['total'], total); ck('Social Security', o['ss'], ss); ck('Medicare', o['medicare'], med); ck('deductible half', o['half'], half)
        elif fn == 'stateTax':
            st, city = law.state(x['gross'], x['pretax'], x['filingStatus'], x['place'])
            ck('state', o['state'], st); ck('city', o['local'], city)
        elif fn == 'takeHome':
            ck('take-home', o['takeHome'], law.take_home(x['gross'], x['pretax'], x['roth'], x['filingStatus'], x['selfEmployed'], x['place']))
        elif fn == 'grossFromTakeHome':
            # the answer is right when it gives back the take-home it started from (to the dollar the search stops at)
            back = law.take_home(o['gross'], x['pretax'], 0, x['filingStatus'], False, x['place'])
            ck('take-home it gives back', x['takeHome'], back, 1.5)
        elif fn == 'debtOne':
            m = one_debt(x['balance'], x['apr'], x['payment'])
            ck('never pays off', o['never'], m['never']); ck('months', o['months'], m['months'], 0); ck('payment needed', o['paymentNeeded'], m['paymentNeeded'], 0)
            ck('interest really paid', o['interest'], m['true_interest'])
            ck('interest stepped month by month', o['simulated'], m['true_interest'])
            ck('interest by the formula', o['formula'], m['formula_interest'])
            ck('card minimum', o['minimum'], min(x['balance'], max(25, x['balance'] * 0.01 + x['balance'] * x['apr'] / 12)))
            if not m['never'] and m['formula_interest'] is not None:
                extra['interest_gap'].append(m['formula_interest'] - m['true_interest'])
        elif fn == 'debtPlan':
            p = debt_plan(x['debts'], x['extra'], x['order'])
            ck('months', o['months'], p['months'], 0); ck('interest', o['interest'], p['interest'])
            for name, month in o['each'].items():
                ck(f'{name} gone in month', month, p['each'][name], 0)
        elif fn == 'fiNumber':
            ck('FI number', o['fi'], x['annualSpending'] / x['withdrawalRate'])
        elif fn == 'fiDate':
            n = months_to(x['invested'], x['monthlyInvesting'], x['realReturn'], x['target'])
            ck('never', o['never'], n is None); ck('months', o['months'], n, 0)
        elif fn == 'coastFi':
            ck('Coast FI', o['coast'], x['fiNumber'] / (1 + x['realReturn']) ** max(0, x['retireAge'] - x['age']))
        elif fn == 'solveSaving':
            g = (1 + x['realReturn']) ** (1 / 12); n = x['months']
            need = (x['target'] - x['invested'] * g ** n) * (g - 1) / (g ** n - 1)
            ck('monthly saving', o['monthly'], 0 if need <= 0 else math.ceil(need - 1e-7), 1)
        elif fn == 'yearsAtRate':
            s = x['s']; n = months_to(0, s * 1000, x['realReturn'], (1 - s) * 12000 / x['withdrawalRate'])
            ck('years', o['years'], None if n is None else n / 12, 1e-9)
        elif fn == 'runway':
            gap = x['spending'] * (1 - x['cut']) - x['stillIn']
            ck('covered', o['covered'], gap <= 0)
            if gap > 0:
                ck('months', o['months'], x['cash'] / gap, 1e-6); ck('whole months', o['whole'], math.floor(x['cash'] / gap), 0)
        elif fn == 'backwards':
            # the plan's own pace: 7% a year means 7% a year, so a month grows by (1.07)^(1/12)
            total = x['need'] * 12 / wr; n = x['years'] * 12; g = (1 + rr) ** (1 / 12)
            grown = x['have'] * g ** n; short = max(0.0, total - grown)
            needed = 0 if short <= 0 else short * (g - 1) / (g ** n - 1)
            ck('total needed', o['total'], total)
            same_g = ck('what you have, grown', o['grown'], grown); same_n = ck('saving needed a month', o['needed'], needed)
            if o['grown'] and grown:
                extra['pace'].append((o['grown'] / grown - 1, (o['needed'] or 0) - needed, x))
        elif fn == 'taxableSS':
            ck('taxed part', o['taxed'], law.taxed_ss(x['ss'], x['other'], x['filingStatus']))
        elif fn == 'gainsTax':
            ck('tax', o['tax'], law.gains_tax(x['gains'], x['ordinaryTaxable'], x['key']))
        elif fn == 'rmd':
            ck('required withdrawal', o['out'], rmd(x['age'], x['pretax'], x['startAge']))
        elif fn == 'premiumCredit':
            ck('credit', o['credit'], premium_credit(x['income'], x['benchmark'], x['people']))
        elif fn == 'yearTax':
            ck('tax', o['tax'], law.year_tax(x['ordinary'], x['ss'], x['gains'], x['tax']))
        elif fn == 'medicare':
            ck('extra premium', o['extra'], law.irmaa(x['magi'], x['filingStatus']))
        elif fn == 'lifetime':
            audit = []
            mine = whole_life(x, law, audit)
            for name in ('ok', 'ranOutAge', 'atRetire', 'end', 'lifetimeTax', 'penalties', 'surcharges'):
                ck(name, o[name], mine[name])
            ck('lowest spend share', o['lowestSpend'], mine['lowestSpend'], 1e-6)
            ck('number of years', len(o['years']), len(mine['years']), 0)
            ck('years the credit was left out', len(o['creditHeld']), len(mine['creditHeld']), 0)
            for a, m in zip(o['creditHeld'], mine['creditHeld']):
                ck('credit left out at', a[0], m[0], 0); ck('which line', a[1] == m[1], True)
            cols = ['age', 'total', 'tax', 'spend', 'withdraw', 'convert', 'penalty', 'short', 'taxable', 'pretax', 'roth']
            for a, m in zip(o['years'], mine['years']):
                for j in range(1, 11):
                    if not ck(f'{cols[j]} at {a[0]}', a[j], m[j]):
                        break
            L = extra['life']; L['runs'] += 1; touched = False
            for y in audit:
                L['years'] += 1
                if not y['settled']:
                    L['unsettled_years'] += 1
                if abs(y['tax_gap']) > 1 and not y['short']:
                    L['tax_gap_years'] += 1; touched = True
                    if abs(y['tax_gap']) > abs(L['worst_tax_gap']):
                        L['worst_tax_gap'] = y['tax_gap']; L['worst_tax_case'] = {'age': y['age'], 'input': x}
                if abs(y['credit_gap']) > 1 and not y['short']:
                    L['credit_gap_years'] += 1; touched = True
                    L['worst_credit_gap'] = max(L['worst_credit_gap'], abs(y['credit_gap']))
            L['runs_touched'] += 1 if touched else 0
        elif fn == 'earliest':
            found = None
            for a in range(x['age'], 81):
                run_ = whole_life({**x, 'retireAge': a}, law)
                tol_share = {'fixed': 0.999, 'guardrails': 0.699, 'floor': 0.849, 'percent': 0.75}[(x.get('strategy') or {}).get('id', 'fixed')]
                if run_['ok'] and run_['lowestSpend'] >= tol_share:
                    found = a; break
            ck('earliest age', o['age'], found, 0)
    return R, extra


def anchors(ref):
    """Checks against numbers printed by the source itself, not worked out by either engine."""
    law, out = Law(ref), []
    for k, rows in IRS_PRINTED.items():
        status = {'single': 'Single', 'joint': 'Married jointly', 'head': 'Head of household'}[k]
        std = ref['tax']['standardDeduction'][k]
        for taxable, printed in rows:
            got = law.federal(taxable + std, 0, status)[0]
            out.append({'what': f'Federal tax at ${taxable:,} taxable, {status} (Rev. Proc. 2025-32)', 'printed': printed, 'got': round(got, 2), 'ok': abs(got - printed) < 0.01})
    # Social Security wage base and rates
    t = ref['tax']
    out.append({'what': 'Social Security wage base 2026 (SSA)', 'printed': 184500, 'got': t['socialSecurityWageBase'], 'ok': t['socialSecurityWageBase'] == 184500})
    out.append({'what': 'Standard deduction 2026 single / joint / head', 'printed': [16100, 32200, 24150], 'got': [t['standardDeduction'][k] for k in ('single', 'joint', 'head')], 'ok': [t['standardDeduction'][k] for k in ('single', 'joint', 'head')] == [16100, 32200, 24150]})
    tiers = (ref.get('cliff') or {}).get('medicare', {}).get('tiers')
    out.append({'what': 'Medicare extra premium lines and amounts 2026 (CMS)', 'printed': 'typed in again', 'got': 'matches' if tiers and [tuple(r) for r in tiers] == IRMAA_2026 else 'differs', 'ok': bool(tiers) and [tuple(r) for r in tiers] == IRMAA_2026})
    # a loan worked by hand: $10,000 at 6% over 36 months is $304.22 a month (standard amortization table)
    m = one_debt(10000, 0.06, 304.22)
    out.append({'what': '$10,000 at 6% paying $304.22: months', 'printed': 36, 'got': m['months'], 'ok': m['months'] == 36})
    # $100 a month at 7% for 30 years, compounding once a year's worth each year
    g = 1.07 ** (1 / 12)
    v = 100 * (g ** 360 - 1) / (g - 1)
    out.append({'what': '$100 a month for 30 years at 7% a year', 'printed': 'about $116,900', 'got': round(v), 'ok': 116000 < v < 118000})
    return out


def main():
    cases_path, ref_path = sys.argv[1], sys.argv[2]
    data, ref = json.load(open(cases_path)), json.load(open(ref_path))
    R, extra = run(data['cases'], ref)
    A = anchors(ref)
    ig = extra['interest_gap']; pace = extra['pace']
    summary = {
        'seed': data.get('seed'), 'made': data.get('made'), 'cases': len(data['cases']),
        'checks': sum(v['checks'] for v in R.by.values()), 'off': sum(v['off'] for v in R.by.values()),
        'byFunction': {k: v for k, v in R.by.items()},
        'anchors': A, 'anchorsOff': sum(1 for a in A if not a['ok']),
        'interestFormulaVsStepped': {'cases': len(ig), 'largest': max((abs(v) for v in ig), default=0), 'average': sum(abs(v) for v in ig) / len(ig) if ig else 0},
        'backwardsPace': {'cases': len(pace), 'largestGrowthGapPct': max((abs(p[0]) for p in pace), default=0) * 100, 'largestMonthlyGap': max((abs(p[1]) for p in pace), default=0)},
        'life': extra['life'],
    }
    if len(sys.argv) > 3:
        json.dump(summary, open(sys.argv[3], 'w'), indent=1)
    print(json.dumps({k: summary[k] for k in ('cases', 'checks', 'off', 'anchorsOff')}))
    for k, v in sorted(R.by.items()):
        print(f"  {k:18} cases {v['cases']:5}  checks {v['checks']:6}  off {v['off']:5}  worst ${v['worst']:,.2f}")
    return summary


if __name__ == '__main__':
    main()
