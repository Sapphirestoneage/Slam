#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-only
"""The second engine: SLAM's money math worked out a second time, in another language, by other routes.

It reads the cases tools/audit/cases.mjs wrote (inputs plus SLAM's answers), works every answer out again and lists
each number that differs by more than a dollar. Where a textbook formula exists it is used here even when SLAM steps
month by month (and the other way round), so the two engines only agree when both are right. The law's numbers that
SLAM keeps in code (not in data/reference-2026.json) are typed in again here from their sources.

Usage: python3 tools/audit/engine2.py <cases.json> <reference-2026.json> [report.json]
"""
import json, math, os, sys
from collections import defaultdict

TOL = 1.0  # dollars
LADDER_MAX = 120  # months the Life Transitions dip looks ahead (RULES.transitionMaxMonths)
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
            # a 0% (or low) offer: its own rate for its first months, then the card's rate
            rate = (d.get('promoApr') or 0) if month <= (d.get('promoMonths') or 0) else d['apr']
            charge = left[i] * rate / 12
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
    if invested + k <= 0:
        return None  # the growth lost each month outruns what goes in
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


# ---------- the ways to take money out (js/math/withdraw.js), written again ----------
# The numbers below are typed in again from their sources, not read from SLAM's file.
WAY_TOLERATES = {'steady': 0.999, 'guardrails': 0.699, 'floor': 0.849, 'share': 0.75, 'age': 0.75, 'held': 0.999, 'market': 0.75, 'custom': 0.75}
VPW_STOCKS, VPW_BONDS, VPW_LAST_AGE = 0.05, 0.019, 99      # Bogleheads wiki, Variable percentage withdrawal (not yet checked against the page: QUESTIONS.md)
CAPE_BASE, CAPE_SLOPE = 0.0175, 0.5                        # Big ERN, Safe Withdrawal Rate series, Part 18 and Part 54
CUT_LINE, CASH_REAL = 0.995, 0.0


def first_set(*values):
    """The first value that is not None (what ?? does in SLAM's code)."""
    for v in values:
        if v is not None:
            return v
    return None


def pay_first_factor(n, g):
    """What 1 paid on the first day of each of n years is worth today, growing at g: the sum, term by term."""
    return sum((1 + g) ** -j for j in range(n))


def vpw_share(age, stock):
    g = stock * VPW_STOCKS + (1 - stock) * VPW_BONDS
    return min(1.0, 1 / pay_first_factor(max(1, VPW_LAST_AGE + 1 - age), g))


def spend_down(start, target, n, g):
    if n <= 0:
        return 0.0 if g == 0 else max(0.0, start * g / (1 + g))
    return max(0.0, (start - target * (1 + g) ** -n) / pay_first_factor(n, g))


def way_tolerance(way):
    return first_set(way.get('tolerate'), WAY_TOLERATES.get(way.get('family')), 0.999)


def way_spend(way, s, mem):
    """One year's spending by a way. Returns (spend, aim)."""
    rule = way.get('rule') or way.get('id') or 'fixed'
    need, start = s['need'], s['start']
    if mem.get('rate0') is None:
        mem['rate0'] = need / start if start > 0 else None
    if mem.get('money0') is None and start > 0:
        mem['money0'] = start
    spend, aim, own = need, need, False
    if rule == 'fixed':
        if way.get('anchor') == 'rate':
            spend = first_set(way.get('rate'), 0.04) * (mem.get('money0') or 0.0)
            aim = spend
        if way.get('skipRaise'):
            last, infl = s.get('last'), s.get('infl')
            if last is not None and infl is not None and infl > 0 and (1 + last) * (1 + infl) < 1:
                mem['real'] = mem.get('real', 1.0) / (1 + infl)   # no raise for prices: the amount buys that much less
            spend *= mem.get('real', 1.0)
    elif rule == 'percent':
        basis = start
        if (way.get('smooth') or 0) > 1:
            mem['ends'] = (mem.get('ends', []) + [start])[-way['smooth']:]
            basis = sum(mem['ends']) / len(mem['ends'])
        spend, own = basis * first_set(way.get('rate'), 0.04), True
    elif rule == 'floor':
        spend = min(need * first_set(way.get('hi'), 1.2), max(need * first_set(way.get('lo'), 0.85), start * first_set(way.get('rate'), mem['rate0'], 0.04)))
    elif rule == 'guardrails':
        if mem['rate0']:
            trim = mem.get('trim', 1.0)
            now_rate = need * trim / start if start > 0 else math.inf
            raise_to = first_set(way.get('raiseTo'), 1.1)
            if now_rate > mem['rate0'] * first_set(way.get('over'), 1.2):
                trim *= first_set(way.get('cutTo'), 0.9)
            elif raise_to > 1 and now_rate < mem['rate0'] * first_set(way.get('under'), 0.8) and trim < 1.3:
                trim *= raise_to
            trim = max(0.7, trim)
            mem['trim'] = trim
            spend = need * trim
    elif rule == 'vanguard':
        target = start * first_set(way.get('rate'), mem['rate0'], 0.04)
        before = mem.get('before')
        spend = target if before is None else min(before * (1 + first_set(way.get('up'), 0.05)), max(before * (1 - first_set(way.get('down'), 0.015)), target))
        mem['before'], own = spend, True
    elif rule == 'vpw':
        spend, own = start * vpw_share(s['age'], first_set(s.get('stock'), 0.6)), True
    elif rule == 'rmd':
        years = UNIFORM.get(min(100, s['age']))
        spend, own = (start / years if years else 0.0), True
    elif rule == 'dwz':
        at = first_set(way.get('targetAge'), s['endAge'] + 1)
        spend, own = min(start, spend_down(start, first_set(way.get('target'), 0), at - s['age'], first_set(way.get('growth'), s.get('growth'), 0))), True
    elif rule == 'cape':
        cape = s.get('cape')
        spend, own = (start * (first_set(way.get('a'), CAPE_BASE) + first_set(way.get('b'), CAPE_SLOPE) / cape) if cape and cape > 0 else 0.0), True
    spend = max(0.0, spend)
    if own:
        if mem.get('year_one') is None and start > 0:
            mem['year_one'] = spend
        aim = first_set(mem.get('year_one'), spend)
    return spend, aim


def way_return(way, yr, s, mem):
    """The year's return of the whole portfolio, by how the money is held."""
    hold = way.get('hold')
    both = yr.get('s') is not None and yr.get('b') is not None
    mix = lambda share: share * yr['s'] + (1 - share) * yr['b'] if both else yr['r']
    plain = yr['r'] if yr.get('r') is not None else mix(s['stock'])
    if not hold:
        return plain
    if hold['kind'] == 'tent':
        return mix(max(0.0, s['stock'] - hold['drop'] * max(0.0, 1 - s['k'] / hold['years'])))
    left = s['start'] - s['w']
    if not left > 0:
        return plain
    gap = s['w']
    if hold['kind'] == 'shield':
        rate = s['stock'] * yr['dy'] + (1 - s['stock']) * yr['by'] if yr.get('dy') is not None and yr.get('by') is not None else 0.0
        gap = max(0.0, s['w'] - rate * max(0.0, s['start'] - mem.get('cash', 0.0)))
    target = hold['years'] * gap
    after_bad_year = s.get('last') is not None and s['last'] < 0
    cash = min(left, max(0.0, mem.get('cash', target) - gap) if after_bad_year else target)
    mem['cash'] = cash * (1 + CASH_REAL)
    return (cash * CASH_REAL + (left - cash) * plain) / left


def way_pay(p, w, r, timing):
    """One year on one pile. Returns (money at the year's end, what could not be paid). Monthly by the annuity formula
    when the money lasts the year (SLAM steps it), and step by step only in a year it runs short."""
    if timing == 'end':
        p = p * (1 + r) - w
        return (p, 0.0) if p >= 0 else (0.0, -p)
    if timing == 'monthly':
        g = (1 + r) ** (1 / 12)
        end = p * g ** 12 - (w / 12) * (12 if g == 1 else g * (g ** 12 - 1) / (g - 1))
        if end >= 0:
            return end, 0.0
        short = 0.0
        for _ in range(12):
            p -= w / 12
            if p < 0:
                short, p = short - p, 0.0
            p *= g
        return p, short
    p -= w
    return (p * (1 + r), 0.0) if p >= 0 else (0.0, -p)


def way_history(cycles, tol):
    works = [c for c in cycles if c['lasted'] and c['lowest'] >= tol]
    if not cycles:
        return {'n': 0, 'ok': 0}
    worst = min(cycles, key=lambda c: (c['ranOutAge'] if c['ranOutAge'] is not None else 999, c['lowest'], c['end']))
    lasted = [c['lowest'] for c in cycles if c['lasted']]
    ends = sorted(c['end'] for c in cycles)
    return {'n': len(cycles), 'ok': len(works), 'worst': worst['start'], 'deepest': min(lasted) if lasted else None, 'cutsWorst': worst['cuts'], 'medianEnd': ends[(len(ends) - 1) // 2]}


def take_year(b, amount, age, r, timing):
    """Take `amount` over one year by the timing. Returns take_out's five numbers and whether the year's growth is in."""
    if timing == 'end':
        for name in ('taxable', 'pretax', 'roth'):
            b[name] *= 1 + r
        return (*take_out(b, amount, age), True)
    if timing != 'monthly':
        return (*take_out(b, amount, age), False)
    month = (1 + r) ** (1 / 12)
    total = [0.0] * 5
    for _ in range(12):
        got = take_out(b, amount / 12, age)
        total = [a + g for a, g in zip(total, got)]
        for name in ('taxable', 'pretax', 'roth'):
            b[name] *= month
    return (*total, True)


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
    timing = strategy.get('timing') or 'start'
    seq, lead = x.get('seq'), x['retireAge'] - x['age']   # a made-up market for the free years: one row a year
    mem, last_r, last_i, lowest_paid, cut_years, first_spend = {}, None, None, 1.0, 0, None

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
        yr = seq[k - lead] if seq and 0 <= k - lead < len(seq) else {'r': x['realReturn']}
        r, grown = yr['r'], False
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
            spend = aim = need
            stock = first_set(yr.get('stock'), x.get('stocks'), 0.8)
            if strategy.get('rule'):
                spend, aim = way_spend(strategy, {'need': need, 'start': start, 'k': age - x['retireAge'], 'age': age, 'endAge': last_age, 'last': last_r, 'infl': last_i,
                                                  'cape': first_set(yr.get('cape'), x.get('cape')), 'stock': stock, 'growth': x['realReturn']}, mem)
            elif strategy['id'] == 'percent':
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
            whole_out = spend if strategy.get('gross') else None   # a way that sets what leaves the accounts, tax and all
            if whole_out is not None:
                base = whole_out
            if strategy.get('hold'):
                r = way_return(strategy, yr, {'stock': stock, 'k': age - x['retireAge'], 'last': last_r, 'start': start, 'w': base}, mem)
            def settle(credit_now, rounds):
                """This year's tax for a given credit: the tax is paid from the same buckets, so it goes round until it stops moving."""
                due_now, c, ok = 0.0, 0.0, False
                for _ in range(rounds):
                    trial = dict(b)
                    got_pre, got_pen, got_gains, got_growth, _s, in_already = take_year(trial, max(whole_out, due_now) if whole_out is not None else max(0.0, base - credit_now) + due_now, age, r, timing)
                    if in_already:   # out monthly or at the end: the required withdrawal and the conversion act on the year-end balance
                        more = min(trial['pretax'], max(0.0, must - got_pre))
                        pre, conv = got_pre + more, min(convert, max(0.0, trial['pretax'] - more))
                    else:
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
            if whole_out is not None:
                base = max(0.0, whole_out - due)
                spend = max(0.0, base + ss + earned + credit - medicare)
            else:
                base = max(0.0, base - credit)
            pre_out, pen, gains, growth_out, short, grown = take_year(b, base + due, age, r, timing)
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
            if first_spend is None:
                first_spend = row['spend']
            if aim > 0:
                part = max(0.0, whole_out - short) / aim if whole_out is not None else row['spend'] / aim
                lowest_paid = min(lowest_paid, part)
                cut_years += 1 if part < CUT_LINE else 0
        if row['short'] > 0.5 and ran_out is None:
            ran_out = age
        if not grown:
            for name in ('taxable', 'pretax', 'roth'):
                b[name] *= 1 + r
        last_r, last_i = r, yr.get('i')
        b['rothFree'] = min(b['rothFree'], b['roth'])
        b['basis'] = min(b['basis'], b['taxable'])
        rows.append([age, total(), row['tax'], row['spend'], row['withdraw'], row['convert'], row['penalty'], row['short'], b['taxable'], b['pretax'], b['roth']])
        k += 1
    return {'ok': ran_out is None, 'ranOutAge': ran_out, 'atRetire': at_retire if at_retire is not None else total(), 'end': total(), 'lifetimeTax': life_tax,
            'penalties': penalties, 'surcharges': surcharges, 'lowestSpend': lowest, 'years': rows, 'creditHeld': held,
            'lowestPaid': lowest_paid, 'cutYears': cut_years, 'firstSpend': first_spend}


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


def il_tax(il, monthly, points, ceiling):
    # the marginal rate walked shekel band by shekel band over the part of the year that is taxed (no "tax on the
    # whole less tax on the exempt part"), on bands built from the yearly list, not the monthly one
    edges = il['incomeTax']['bracketsAnnual'] + [float('inf')]
    rates = [b['rate'] for b in il['incomeTax']['bracketsMonthly']]
    annual = monthly * 12; start = min(annual, ceiling) if ceiling is not None else 0.0
    tax, floor = 0.0, 0.0
    for edge, rate in zip(edges, rates):
        lo, hi = max(floor, start), min(edge, annual)
        if hi > lo: tax += (hi - lo) * rate
        floor = edge
    tax = max(0.0, tax - points * il['creditPoints']['valueMonthly'] * 12)
    return tax + max(0.0, annual - il['incomeTax']['surtax']['aboveAnnual']) * il['incomeTax']['surtax']['rate']


def il_ni(il, monthly):
    # the full rate on everything up to the ceiling, less the discount on the reduced band
    N = il['nationalInsurance']; e = N['employee']; capped = min(monthly, N['ceilingMonthly']); low = min(monthly, N['reducedBandUpToMonthly'])
    part = lambda k: e['full'][k] * capped - (e['full'][k] - e['reduced'][k]) * low
    return part('nationalInsurance') + part('health'), part('health')


def il_points(il, resident, year):
    # month by month through the schedule
    per = [s['extraPoints'] for s in il['creditPoints']['olim']['schedule'] for _ in range(s['months'])]
    return resident + sum(per[(year - 1) * 12:year * 12]) / 12


def gig_check(fn, x, o, ck, law):
    """Gig and self-employed (M8G), worked out again: the floor's profit as a check that it leaves the need, the stacked
    set-aside by hand, the retirement limits from their definitions, invoice dates with the date library, apps and the split."""
    import datetime
    places = {'ny': {'state': 'NY', 'nyc': False}, 'nyc': {'state': 'NY', 'nyc': True}}
    if fn == 'gigRate':
        pl = places.get(x['place'])
        need = x['takeHome'] * 12 + x['health'] * 12 + x['retire']
        ck('need', o['need'], need)
        ck('the profit leaves the need after tax', need, law.take_home(o['profit'], 0, 0, x['filingStatus'], True, pl), 1.5)
        hours = x['hoursWeek'] * min(1, x['billable']) * (52 - x['weeksOff'])
        ck('floor an hour', o['hourly'], (o['profit'] + x['costs'] * 12) / hours, 1e-6)
        ck('floor a job', o['unit'], (o['profit'] + x['costs'] * 12) / hours * x['unitHours'] if x['unitHours'] else None, 1e-6)
    elif fn == 'gigSetAside':
        t, k = law.t, key_of(x['filingStatus'])
        w, se = x['wages'], x['profit'] * 0.9235
        cap, over = t['socialSecurityWageBase'], t['additionalMedicareOver'][k]
        ss = (min(w + se, cap) - min(w, cap)) * 0.124
        med = se * 0.029
        extra = (max(0.0, w + se - over) - max(0.0, w - over)) * 0.009
        half = (ss + med) / 2
        std, br = t['standardDeduction'][k], t['brackets'][k]
        job_in = max(0.0, w - x['pretax']) if w > 0 else 0.0
        fed = stepped(max(0.0, job_in + x['profit'] - half - std), br)[0] - stepped(max(0.0, job_in - std), br)[0]
        st = 0.0
        if x['place']:
            S = t['state']['NY']
            s_in = lambda g: max(0.0, g - S['standardDeduction'][k])
            st = stepped(s_in(job_in + x['profit']), S['brackets'][k])[0] - stepped(s_in(job_in), S['brackets'][k])[0]
            if x['place'] == 'nyc':
                C = t['local']['NYC']['brackets'][k]
                st += stepped(s_in(job_in + x['profit']), C)[0] - stepped(s_in(job_in), C)[0]
        total = fed + ss + med + extra + st
        ck('self-employment tax', o['se'], ss + med + extra); ck('the year', o['yearly'], total); ck('a share of each dollar', o['rate'], total / x['profit'], 1e-9)
        ck('to move so far', o['toMove'], max(0.0, x['earned'] * total / x['profit'] - x['set']) if x['earned'] is not None else None, 0.01)
    elif fn == 'gigRetire':
        L, p = x['limits'], x['profit']
        net = p * 0.9235
        half = (min(net, law.t['socialSecurityWageBase']) * 0.124 + net * 0.029) / 2
        base = max(0.0, p - half); comp = min(base, L['compCap'])
        employer = comp * 0.25 / 1.25
        a = x['age']; cu = L['catchUp60to63'] if 60 <= a <= 63 else L['catchUp50'] if a >= 50 else 0
        defer = min(max(0.0, L['deferral'] - x['deferredAtJob']), base)
        main = min(defer + employer, L['total'], base)
        solo = main + min(cu, max(0.0, base - main)); sep = min(employer, L['total']); ira = min(L['ira'] + (L['iraCatchUp50'] if a >= 50 else 0), base)
        ck('half the self-employment tax', o['seHalf'], half); ck('Solo 401(k)', o['solo'], solo); ck('SEP', o['sep'], sep); ck('IRA', o['ira'], ira)
        wnt = x['want']
        first = None if base <= 0 else ('solo' if solo > sep else 'sep') if wnt is None else 'ira' if wnt <= ira else 'sep' if wnt <= sep else 'solo'
        ck('which first', o['first'] == first, True)
    elif fn == 'gigInvoices':
        D = lambda s: datetime.date.fromisoformat(s)
        today = D(x['today']); waiting = past = got = 0.0; ages = [0.0] * 4; days = {}; paid_days = []
        for i in x['list']:
            due = D(i['due']) if i.get('due') else D(i['sent']) + datetime.timedelta(days=i['terms'])
            if i.get('paid'):
                got += i['amount']; paid_days.append((D(i['paid']) - D(i['sent'])).days); days[str(i['id'])] = 0
            elif today > due:
                n = (today - due).days; days[str(i['id'])] = n; waiting += i['amount']; past += i['amount']
                ages[0 if n <= 30 else 1 if n <= 60 else 2 if n <= 90 else 3] += i['amount']
            else:
                days[str(i['id'])] = 0; waiting += i['amount']
        ck('still coming', o['waiting'], waiting); ck('past its date', o['past'], past); ck('paid', o['got'], got)
        for b in range(4):
            ck(f'age band {b + 1}', o['ages'][b], ages[b])
        for key, n in days.items():
            ck(f'days past, invoice {key}', o['days'][key], n, 0)
        ck('days to get paid', o['avg'], sum(paid_days) / len(paid_days) if paid_days else None, 1e-9)
    elif fn == 'gigApps':
        apps = x['apps']; earned = sum(a['earned'] for a in apps)
        ck('all of it', o['all'], earned + x['cash']); ck('tips', o['tips'], sum(min(a['earned'], a['tips']) for a in apps) + x['cash'])
        landed = [a for a in apps if a['landed'] is not None]
        ck('gap to the bank', o['gap'], sum(max(0, a['earned'] - a['fee']) - a['landed'] for a in landed) if landed else None)
        P = x['pcts']; tot = sum(P.values())
        ck('pay to you', o['owner'], x['income'] * P['owner'] if tot <= 1 + 1e-9 else None); ck('no place yet', o['left'], x['income'] * (1 - tot) if tot <= 1 + 1e-9 else None)


def quick_check(fn, x, o, ck, law):
    """The quick calculators (M8Q), worked out again: closed forms where SLAM steps, and the other way round."""
    def fv(start, monthly, rate, n):
        b = start
        for _ in range(n):   # month by month, where SLAM uses the closed form
            b = b * (1 + rate / 12) + monthly
        return b
    if fn == 'qcHysa':
        m, n = x['monthly'], x['years'] * 12
        y_from, y_to = fv(x['balance'], m, x['fromRate'], 12), fv(x['balance'], m, x['toRate'], 12)
        ck('a year more', o['yearGain'], y_to - y_from); ck('where it is', o['endFrom'], fv(x['balance'], m, x['fromRate'], n)); ck('the other account', o['endTo'], fv(x['balance'], m, x['toRate'], n))
    elif fn == 'qcDca':
        n, g, c = x['months'], (1 + x['ret']) ** (1 / 12) - 1, x['cashRate'] / 12
        piece = x['amount'] / n
        # each piece grows from the month it goes in; the money still waiting grows at the cash rate until then
        # the money waiting after the k-th piece goes in: what was there, grown, less every piece so far, each grown since
        left = lambda k: x['amount'] * (1 + c) ** k - sum(piece * (1 + c) ** (k - j) for j in range(k + 1))
        spread = sum(piece * (1 + g) ** (n - k) for k in range(n)) + left(n - 1) * (1 + c)
        waiting = sum(left(k) for k in range(n)) / n
        ck('all at once', o['lump'], x['amount'] * (1 + x['ret']) ** (n / 12)); ck('spread', o['spread'], spread); ck('waiting on an average month', o['waiting'], waiting)
    elif fn == 'qcSmall':
        ck('chance x repair', o['expected'], x['repair'] * x['chance']); ck('where they meet', o['even'], x['price'] / x['repair'], 1e-9)
        ck('a use', o['perUse'], (x['price'] - min(x['price'], x['resale'])) / x['uses'], 1e-9)
        ck('an hour of the task', o['perHour'], x['saved'] / x['hours'], 1e-9); ck('times the wage', o['times'], x['saved'] / x['hours'] / x['wage'] if x['wage'] else None, 1e-9)
    elif fn == 'qcInflation':
        ps = [q for q in x['parts'] if q['amount']]
        tot = sum(q['amount'] for q in ps); rate = sum(q['amount'] * q['change'] for q in ps) / tot
        ck('own inflation', o['rate'], rate, 1e-12); ck('a year more than the plan', o['yearMore'], tot * 12 * rate)
    elif fn == 'qcStart':
        g = (1 + x['ret']) ** (1 / 12) - 1
        def grow(age):
            b = 0.0
            for _ in range(max(0, (x['to'] - age) * 12)):
                b = b * (1 + g) + x['monthly']
            return b
        lo, hi = min(x['ageA'], x['ageB']), max(x['ageA'], x['ageB'])
        if x['ageA'] >= x['to']:
            return
        a, b = grow(lo), grow(hi)
        ck('from the early age', o['a'], a, max(1.0, a * 1e-9)); ck('from the late age', o['b'], b, max(1.0, b * 1e-9))
        ck('catch-up a month', o['catchUp'], x['monthly'] * a / b if b > 0 else None, 0.01)
    elif fn == 'qcAdd':
        stage = lambda a: x['little'] if a <= 4 else x['school'] if a <= 12 else x['teen']
        ck('kids to 18', o['kids'], sum(stage(a) for a in range(x['age'], 18)))
        year = x['monthly'] * 12 + x['vet']
        ck('pet, all the years', o['pet'], x['upfront'] + year * x['years']); ck('pet, the first year', o['petFirst'], x['upfront'] + year)
        ck('the keys', o['keys'], x['rent'] * (1 + x['depositMonths'] + x['lastMonth'] + x['brokerMonths']) + x['moving'] + x['setup']); ck('a month after', o['month'], x['rent'] + x['monthlyOther'])
    elif fn == 'qcJobless':
        N, hq = x['rules'], x['highQuarter']
        if hq > N['lowLine']:
            wk = max(N['minWeekly'], hq / N['divisorHigh'])
        else:
            wk = max(N['minWeeklyLow'], hq / N['divisorLow'])
        wk = min(N['maxWeekly'], wk)
        ck('a week', o['weekly'], wk, 1e-9)
        # day by day instead of by pieces: cash runs down by the gap while the benefit lasts, then by the whole month
        cash, inm, bm, out = x['cash'], wk * x['keep'] * 52 / 12, N['weeks'] * 12 / 52, x['spending']
        gap = out - inm
        if gap > 0 and cash / gap <= bm:
            months = cash / gap
        else:
            months = bm + (cash - gap * bm) / out
        ck('months the cash lasts', o['months'], months, 1e-6)
    elif fn == 'qcConsolidate':
        m = one_debt(x['balance'], x['apr'], x['payment'])
        ck('never pays off', o['never'], m['never'])
        if not m['never']:
            ck('months now', o['nowMonths'], m['months'], 0); ck('interest now', o['nowInterest'], m['true_interest'])
        P, r, n = x['balance'] / (1 - x['feePct']), x['loanApr'] / 12, x['loanYears'] * 12
        pay = P / n if r == 0 else P / sum((1 + r) ** -k for k in range(1, n + 1))   # the annuity as a sum of discounted payments
        ck('loan a month', o['loanPay'], pay, 0.01); ck('loan interest and fee', o['loanCost'], pay * n - x['balance'])
    elif fn == 'qcLeave':
        need = x['spending'] + x['health']
        if x['profit'] > 0:
            g = x['profit'] * 12
            pay, _, _, half = law.payroll(g, 'Single', True)
            tax = (law.federal(g, 0, 'Single', half)[0] + pay) / 12
        else:
            tax = 0.0
        ck('tax a month', o['tax'], tax); gap = need - (x['profit'] - tax)
        ck('months', o['months'], x['cash'] / gap if gap > 0 else None, 1e-6)
    elif fn == 'qcRoommates':
        ps = x['people']; n = len(ps)
        def share(way, p):
            if way == 'size':
                return p['size'] / sum(q['size'] for q in ps)
            if way == 'income':
                return p['income'] / sum(q['income'] for q in ps)
            return 1 / n
        bway = x['how'] if x['billsHow'] == 'same' else 'equal'
        for i, p in enumerate(ps):
            ck(f'person {i + 1} total', o['totals'][i], x['rent'] * share(x['how'], p) + x['bills'] * share(bway, p), 1e-6)
    elif fn == 'qcW4':
        tax, _, top = law.federal(x['gross'], x['pretax'], x['filingStatus'])
        C = law.t['ctc']; joint = x['filingStatus'] == 'Married jointly'
        most = x['kids'] * C['perChild']; magi = x['gross'] - x['pretax']
        cut = math.ceil(max(0, magi - (C['phaseOutJoint'] if joint else C['phaseOutSingle'])) / 1000) * C['phaseOutPer1000']
        credit = max(0, most - cut); non = min(credit, tax)
        refundable = max(0, min(credit - non, x['kids'] * C['refundableMax'], C['refundableRate'] * max(0, x['gross'] - C['earnedFloor'])))
        owe = max(0, tax - non) - refundable
        diff = x['withheld'] + x['perCheck'] * x['checksLeft'] - owe
        left = max(1, x['checksLeft'])
        ck('the year\'s tax', o['owe'], owe); ck('refund or owed', o['diff'], diff)
        ck('Step 4(c) a paycheck', o['extra'], -diff / left if diff < 0 else 0)
        ck('Step 4(b) deductions', o['deductions'], diff * x['checksYear'] / (left * top) if diff > 0 and top > 0 else 0, 0.05)
    elif fn == 'qcGlance':
        left = x['takeHome'] - x['spending'] - x['debtOutside']
        ck('left', o['left'], left); ck('kept', o['rate'], left / x['takeHome'], 1e-12)


def run(cases, ref, il=None):
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
        elif fn == 'fatFi':
            # Fat: a year of spending plus the list of extras, over the rate; with no list, the Regular number times the factor
            extras = x.get('extrasAnnual')
            listed = extras is not None and extras > 0
            regular = x['annualSpending'] / x['withdrawalRate']
            fat = (x['annualSpending'] + extras) / x['withdrawalRate'] if listed else regular * x['factor']
            ck('Fat FI', o['fat'], fat); ck('from the list', o['fromList'], listed); ck('Chubby FI, the midpoint', o['chubby'], regular + (fat - regular) / 2)
        elif fn == 'baristaGap':
            pay, spend, health = x['partTimeIncome'], x['annualSpending'], x.get('healthAnnual')
            ck('what the pay closes', o['closes'], (spend if pay > spend else pay) / x['withdrawalRate'])
            ck('still from investments a year', o['left'], spend - pay if spend > pay else 0)
            ck('after health insurance', o['afterHealth'], None if health is None else pay - health)
            ck('covers health insurance', o['covers'], None if health is None else pay >= health)
            # the Barista number (M52): the yearly need (spending, plus health insurance when it is tapped, less the pay) at the rate
            need = spend - pay + (health or 0)
            ck('Barista FI number', o['barista'], need * (1 / x['withdrawalRate']))
        elif fn == 'fiStress':
            soon, late, never = None, None, False
            for rate, row in zip(x['rates'], o['rows']):
                target = x['annualSpending'] / rate
                ck('FI number at the rate', row['target'], target)
                for ret, theirs in zip(x['returns'], row['months']):
                    n = months_to(x['invested'], x['monthlyInvesting'], ret, target)
                    ck('months in the box', theirs, n, 0)
                    if n is None: never = True
                    else: soon, late = (n if soon is None else min(soon, n)), (n if late is None else max(late, n))
            ck('soonest', o['soonest'], soon, 0); ck('latest', o['latest'], None if never else late, 0)
        elif fn == 'fireSheet':
            # The FIRE sheet (M9I), by another route: a working year is stepped month by month (growth, then that
            # month's twelfth goes in), where SLAM and the sheet use one closed-form factor for the year.
            r, need, kind = x['realReturn'], x['spendingAfter'], x['kind']
            g, bal, dial, first, was_free = (1 + r) ** (1 / 12), x['invested'], 1.0, 0.0, False
            fi = need / x['safeRate']
            for row, age in zip(o['rows'], range(x['age'], x['lastAge'] + 1)):
                if age < x['stopAge']:
                    put = sum(x['contributions'])
                    for _ in range(12): bal = bal * g + put / 12
                    w, spend, rate = 0, x['spending'], (put / x['income'] if x['income'] > 0 else None)
                else:
                    start, income = bal, (x['other'] if age >= x['otherAge'] else 0)
                    if not was_free: first = need / start if start > 0 else 0.0
                    if kind == 'guardrails' and first:
                        if need * dial > first * 1.2 * start: dial *= 0.9
                        elif need * dial < first * 0.8 * start and dial < 1.3: dial *= 1.1
                        dial = max(0.7, dial)
                    target = start * x['rate'] if kind == 'share' else min(need * 1.2, max(need * 0.85, start * x['rate'])) if kind == 'floor' else need * dial if kind == 'guardrails' else need
                    w = min(start, max(0, target - income)); spend, rate = w + income, None
                    bal, was_free = (start - w) * (1 + r), True
                ck('balance at year end', row[0], bal); ck('withdrawal', row[1], w); ck('spending', row[2], spend)
                ck('savings rate', row[3], rate, 1e-9); ck('% to FI', row[4], bal / fi if fi > 0 else None, 1e-6)
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
        elif fn == 'ilTax':
            pts = il_points(il, x['resident'], x['year']); ni, health = il_ni(il, x['monthly'])
            ck('credit points', o['points'], pts, 1e-9); ck('income tax a year', o['tax'], il_tax(il, x['monthly'], pts, x['ceiling'])); ck('National Insurance and health', o['ni'], ni); ck('health part', o['health'], health)
        elif fn == 'aliyah':
            # one month each side, in dollars: pay less tax less costs less debt
            fed, _, _ = law.federal(x['usGross'], 0, x['filing']); pay, _, _, _ = law.payroll(x['usGross'], x['filing'], False)
            us = (x['usGross'] - fed - pay) / 12 - x['usSpend'] - x['debt']
            pts = il_points(il, il['creditPoints']['residentBase']['man'], x['year'])
            net = x['salary'] - il_tax(il, x['salary'], pts, None) / 12 - il_ni(il, x['salary'])[0] - x['ilSpend']
            isr = net / x['rate'] - (x['usTaxAbroad'] or 0) / 12 - x['debt']
            ck('left in the US', o['usLeft'], us); ck('left in Israel', o['ilLeft'], isr); ck('the gap', o['diff'], isr - us)
            after = max(0, x['savings'] - x['moveCost']); out_us, out_il = x['usSpend'] + x['debt'], x['ilSpend'] / x['rate'] + x['debt']
            ck('months covered, US', o['monthsUs'], x['savings'] / out_us, 1e-6); ck('months covered, Israel', o['monthsIl'], after / out_il, 1e-6)
            ck('months the savings last', o['lasts'], after / -isr if isr < 0 else None, 1e-6)
        elif fn == 'trip':
            # a price left to grow to 65 at the plan's return; the FI month before and after by the closed form
            grow = lambda age: x['cost'] * (1 + rr) ** max(0, 65 - age)
            ck('grown to 65', o['grown'], grow(x['age'])); ck('a year of spending it pays for', o['aYear'], grow(x['age']) * wr)
            ck('the same trip at 22', o['at22'], grow(22)); ck('the same trip at 60', o['at60'], grow(60))
            ck('share of what is invested', o['share'], x['cost'] / x['invested'] if x['invested'] else None, 1e-9)
            ck('months of saving', o['monthsOfSaving'], x['cost'] / x['monthly'] if x['monthly'] else None, 1e-9)
            if x['monthly'] and x['invested'] is not None:
                T = x['spending'] * 12 / wr
                before, after = months_to(x['invested'], x['monthly'], rr, T), months_to(x['invested'] - x['cost'], x['monthly'], rr, T)
                ck('FI month before', o['before'], before, 0); ck('FI month after', o['after'], after, 0)
                ck('months later', o['delay'], None if before is None or after is None else after - before, 0)
        elif fn == 'workYears':
            # the share kept, then each month stepped until the pile reaches 25x (or 1/wr x) a year of the rest
            s = (x['takeHome'] - x['spending']) / x['takeHome']
            ck('share kept', o['rate'], s, 1e-9)
            if s > 0:
                yrs = lambda sh, r, w: (lambda n: None if n is None else n / 12)(months_to(0, sh * 1000, r, (1 - sh) * 12000 / w))
                up = min(0.95, s + 0.05)
                ck('years', o['years'], yrs(s, rr, wr), 1e-9); ck('five points more', o['up'], up, 1e-9); ck('years at five points more', o['yearsUp'], yrs(up, rr, wr), 1e-9)
                ck('more a month', o['moreAMonth'], (up - s) * x['takeHome']); ck('at the printed 5% and 4%', o['printed'], yrs(s, 0.05, 0.04), 1e-9)
        elif fn == 'coast':
            fi = x['spending'] * 12 / wr; n = max(0, x['retireAge'] - x['age']); coast = fi
            for _ in range(n): coast /= (1 + rr)   # one year of growth taken off at a time
            grown = x['invested']
            for _ in range(n): grown *= (1 + rr)
            ck('FI number', o['fi'], fi); ck('Coast number', o['coast'], coast); ck('there', o['there'], x['invested'] >= coast); ck('gap', o['gap'], max(0, coast - x['invested'])); ck('left alone', o['grown'], grown, max(1.0, grown * 1e-9))
        elif fn == 'dollarLater':
            t = 1.0
            for _ in range(max(0, 65 - x['age'])): t *= (1 + rr)
            ck('times', o['times'], t, 1e-9); ck('grown', o['grown'], x['amount'] * t, max(0.01, x['amount'] * t * 1e-9))
        elif fn == 'carFits':
            # the most loan: each of 36 payments discounted on its own; the price's payment: bisected until the loan clears
            pay = x['grossMonthly'] * 0.08; r = x['apr'] / 12
            loan = sum(pay / (1 + r) ** k for k in range(1, 37))
            ck('most payment', o['maxPayment'], pay); ck('most loan', o['maxLoan'], loan); ck('most price', o['maxPrice'], loan / 0.8)
            if x['price']:
                owed = x['price'] * 0.8; lo, hi = 0.0, owed * 2 + 1
                for _ in range(200):
                    mid = (lo + hi) / 2; left = owed
                    for _k in range(36): left = left * (1 + r) - mid
                    if left > 0: lo = mid
                    else: hi = mid
                ck('this price a month', o['payment'], (lo + hi) / 2, 0.01); ck('inside 8%', o['fits'], (lo + hi) / 2 <= pay + 0.005)
        elif fn == 'expectedWorth':
            exp = x['age'] * x['grossYear'] / 10; adj = x['age'] * x['grossYear'] / (10 + max(0, 40 - x['age']))
            ck('expected', o['expected'], exp); ck('ratio', o['ratio'], x['netWorth'] / exp, 1e-9); ck('adjusted', o['adjusted'], adj); ck('adjusted ratio', o['adjustedRatio'], x['netWorth'] / adj, 1e-9)
        elif fn == 'realWage':
            paid = x['hoursWeek'] * 52 / 12; allh = (x['hoursWeek'] + x['commuteWeek']) * 52 / 12
            real = (x['takeHome'] - x['costs']) / allh
            ck('real wage', o['real'], real, 1e-9); ck('on paper', o['stated'], x['takeHome'] / paid, 1e-9); ck('hours per $100', o['hoursPer100'], 100 / real if real > 0 else None, 1e-9)
        elif fn == 'split':
            t = x['takeHome']; left = t - x['needs'] - x['wants']
            ck('left', o['left'], left); ck('needs share', o['needs'], x['needs'] / t, 1e-9); ck('wants share', o['wants'], x['wants'] / t, 1e-9); ck('kept share', o['kept'], left / t, 1e-9)
            ck('50', o['markNeeds'], t / 2); ck('30', o['markWants'], t * 3 / 10); ck('20', o['markLeft'], t / 5)
        elif fn == 'homeFits':
            g = x['grossMonthly']; a1 = x['front'] * g; b1 = max(0, x['back'] * g - x['otherDebt']); pay = max(0, min(a1, b1))
            pi = pay * (1 - x['taxIns']); r = x['rate'] / 12
            loan = sum(pi / (1 + r) ** k for k in range(1, x['years'] * 12 + 1))   # each payment discounted on its own
            ck('payment', o['payment'], pay); ck('loan', o['loan'], loan, max(1.0, loan * 1e-9)); ck('the 36% line is the tighter one', o['by'] == 'back', b1 < a1)
        elif fn == 'rcRoute':
            # count the months on a calendar, one at a time, instead of by arithmetic on year * 12 + month
            def walk(y, m, n):
                for _ in range(n):
                    m += 1
                    if m == 13: y, m = y + 1, 1
                return y, m
            oy, om = walk(int(x['planAt'][:4]), int(x['planAt'][5:7]), x['planMonths'])
            ck('old month', int(o['oldYm'][:4]) * 100 + int(o['oldYm'][5:7]), oy * 100 + om, 0)
            if x['months'] is None:
                ck('no date', o['noDate'], True); ck('moved', o['moved'], True)
            else:
                ny, nm = walk(int(x['nowAt'][:4]), int(x['nowAt'][5:7]), x['months'])
                ck('new month', int(o['newYm'][:4]) * 100 + int(o['newYm'][5:7]), ny * 100 + nm, 0)
                shift, y, m = 0, min((oy, om), (ny, nm))[0], min((oy, om), (ny, nm))[1]
                while (y, m) != max((oy, om), (ny, nm)):
                    y, m = walk(y, m, 1); shift += 1
                if (ny, nm) < (oy, om): shift = -shift
                ck('shift', o['shift'], shift, 0); ck('moved', o['moved'], shift != 0); ck('later', o['later'], shift > 0)
        elif fn == 'rcTriage':
            # each class in turn takes what it can from the money left (a pool per class, not a walk down one list)
            order = ['housing', 'utilities', 'food', 'health', 'childcare', 'transport', 'minimums', 'rest']   # Eli, 2026-11-25: health cover, medicine and childcare are must-pay
            left, total, first, paid = float(x['income']), 0.0, None, {}
            for k, cls in enumerate(order):
                mine = [b for b in x['bills'] if b['cls'] == cls and b['amount'] is not None]
                for b in mine:
                    p = min(b['amount'], left); paid[b['name']] = p; left -= p; total += b['amount']
                    if p < b['amount'] and first is None: first = k
            ck('total', o['total'], total); ck('short', o['short'], max(0.0, total - x['income'])); ck('left over', o['left'], max(0.0, x['income'] - total))
            ck('covered', o['covered'], total <= x['income']); ck('first short', o['firstShort'], first, 0)
            ck('open', o['open'], sum(1 for b in x['bills'] if b['amount'] is None), 0)
            for name, p in paid.items(): ck('paid ' + name, o['paid'][name], p)
            ck('everything paid adds up', sum(v for v in o['paid'].values() if v is not None), min(total, x['income']))
        elif fn == 'snOutside':
            # each piece fades by 0.5 ** (age / half-life); the quiz has weight Q / (Q + E), Q its own plus points
            # and E the faded plus points of every other source; the scores are added up by source and trait
            import datetime as _dt
            day = lambda s: _dt.date(int(s[:4]), int(s[5:7]), int(s[8:10]))
            now = day(x['now'])
            fade = lambda d: 1.0 if d is None else 0.5 ** (max(0, (now - day(d)).days) / x['halfLife'])
            plus = lambda a: sum(max(0, v) for v in a.values())
            Q = sum(plus(p['add']) for p in x['ev'] if p['source'] == 'quiz')
            E = sum(plus(p['add']) * fade(p['d']) for p in x['ev'] if p['source'] != 'quiz')
            wq = Q / (Q + E) if Q > 0 else 0.0
            mine = {}
            for p in x['ev']:
                w = wq if p['source'] == 'quiz' else fade(p['d'])
                S = mine.setdefault(p['source'], {})
                for t, v in p['add'].items(): S[t] = S.get(t, 0.0) + v * w
            mine = {k: v for k, v in mine.items() if any(True for p in x['ev'] if p['source'] == k)}
            ck('sources', sorted(o['sources']) == sorted(mine.keys()), True)
            for src, S in mine.items():
                for t, v in S.items(): ck(f'{src} {t}', o['scores'].get(src, {}).get(t), v, 1e-9)
        elif fn == 'snFixCheck':
            # the pattern: plus points of the ledger, the check-ins and the app, in the month before the start and the month from it
            import datetime as _dt
            day = lambda s: _dt.date(int(s[:4]), int(s[5:7]), int(s[8:10]))
            st, now, n, t = day(x['fix']['start']), day(x['now']), x['days'], x['fix']['trait']
            def pat(a, b):
                return sum(max(0, p['add'].get(t, 0)) for p in x['ev'] if p['source'] in ('ledger', 'checkin', 'app') and p['d'] and a <= day(p['d']) < b)
            ck('before', o['before'], pat(st - _dt.timedelta(days=n), st), 1e-9); ck('during', o['during'], pat(st, st + _dt.timedelta(days=n)), 1e-9)
            ck('done', o['done'], (now - st).days >= n); ck('days left', o['daysLeft'], max(0, n - (now - st).days), 0)
        elif fn == 'snClimb':
            # one step for each take on which the first take's top held a smaller whole-percent share of the seven
            # sins' points than at the take before, and one for each ward month whose pattern dropped
            ids, H = x['sinIds'], x['hist']
            def share(sc, i):
                tot = sum(max(0, sc.get(k, 0)) for k in ids)
                return None if tot <= 0 else max(0, sc.get(i, 0)) / tot
            n = 0
            if H and H[0]['sin'] and H[0]['sin']['top']:
                t0 = H[0]['sin']['top']
                for k in range(1, len(H)):
                    a, z = share(H[k - 1]['scores'], t0), share(H[k]['scores'], t0)
                    if a is not None and z is not None and int(z * 100 + 0.5) < int(a * 100 + 0.5): n += 1   # Math.round, half up
            n += sum(1 for f in x['fixes'] if f['dropped'] is True)
            ck('steps', o['n'], n, 0)
        elif fn == 'rcRefill':
            gap = max(0, x['target'] - x['balance'])
            ck('gap', o['gap'], gap); ck('full', o['full'], gap == 0)
            if gap > 0 and x['monthly']:
                n, back = 0, 0.0
                while back < gap - 1e-9:   # put the money back month by month until it is whole
                    back += x['monthly']; n += 1
                ck('months', o['months'], n, 0)
                y, m = int(x['nowAt'][:4]), int(x['nowAt'][5:7]) + n
                while m > 12: y, m = y + 1, m - 12
                ck('month it is whole', int(o['ym'][:4]) * 100 + int(o['ym'][5:7]), y * 100 + m, 0)
            elif gap > 0:
                ck('no months without money going back', o['months'], None)
        elif fn == 'rcCoast':
            # Back under Coast, in closed form. The Coast number and the money grow at the same return, so the gap
            # closes when the saving alone, counted back to today, covers it: P * (1 - g^-n) / (g - 1) >= gap.
            inv, coast, pay = x['invested'], x['coast'], x.get('monthly')
            if inv >= coast:
                ck('below', o['below'], False); ck('months', o['months'], 0, 0)
            else:
                gap = coast - inv
                ck('below', o['below'], True); ck('how far under', o['by'], gap)
                g = (1 + x['realReturn']) ** (1 / 12)
                n = None
                if pay is not None and pay > 0 and gap * (g - 1) / pay < 1:
                    n = max(1, math.ceil(-math.log(1 - gap * (g - 1) / pay) / math.log(g) - 1e-9) - 1)
                    covered = lambda k: pay * (1 - g ** -k) / (g - 1)
                    while covered(n) < gap * (1 - 1e-12): n += 1
                    while n > 1 and covered(n - 1) >= gap * (1 + 1e-12): n -= 1
                    if n > x['maxMonths']: n = None
                if n is None:
                    ck('no date', o['months'], None)
                else:
                    near = o['months'] is not None and abs(o['months'] - n) <= 1 and abs(pay * (1 - g ** -n) / (g - 1) - gap) < max(1e-6, gap * 1e-9)
                    if not near: ck('months back to Coast', o['months'], n, 0)
                    y, m = int(x['nowAt'][:4]), int(x['nowAt'][5:7])
                    for _ in range(o['months'] or 0):
                        m += 1
                        if m == 13: y, m = y + 1, 1
                    if o['ym'] is not None: ck('the month', int(o['ym'][:4]) * 100 + int(o['ym'][5:7]), y * 100 + m, 0)
        elif fn == 'homeBuy':
            # Home buying and renting, without the month-by-month recursion: the loan left after m payments in closed
            # form, the home's value as a power, and each side's money out carried to the end one payment at a time.
            price, n = x['price'], x['years'] * 12
            down = price * x['downPct'] / 100; loan = price - down; lr = x['ratePct'] / 1200
            pay = loan / n if lr == 0 else sum([loan]) / sum(1 / (1 + lr) ** k for k in range(1, n + 1))   # the level payment whose discounted sum is the loan
            def left(m):
                m = min(m, n)
                return max(0.0, loan - pay * m if lr == 0 else loan * (1 + lr) ** m - pay * ((1 + lr) ** m - 1) / lr)
            G = (1 + x['homeGrowthPct'] / 100) ** (1 / 12); Gr = (1 + x['rentGrowthPct'] / 100) ** (1 / 12); ret_m = x['retPct'] / 1200
            under = x['downPct'] < 20
            def own(m):   # the owner's money out in month m (1 is the first)
                v = price * G ** (m - 1)
                pmi = loan * x['pmiPct'] / 1200 if under and left(m - 1) > 0.8 * price else 0.0
                pi = pay if m <= n else 0.0
                return pi + v * (x['taxPct'] + x['maintPct']) / 1200 + (x['insYear'] / 12 + x['hoa'] + x['repairsYear'] / 12) * G ** (m - 1) + pmi, pmi
            rent = lambda m: (x['rent'] + x['rentIns']) * Gr ** (m - 1)
            ck('principal and interest', o['pmt'], pay, max(0.01, pay * 1e-9))
            f = o['first']
            ck('property tax, month 1', f['tax'], price * x['taxPct'] / 1200); ck('insurance, month 1', f['ins'], x['insYear'] / 12)
            ck('PMI, month 1', f['pmi'], loan * x['pmiPct'] / 1200 if under else 0); ck('maintenance, month 1', f['maint'], price * x['maintPct'] / 1200)
            ck('big repairs, month 1', f['repairs'], x['repairsYear'] / 12); ck('owning, month 1', f['total'], own(1)[0]); ck('renting, month 1', o['rent1'], rent(1))
            outs = [own(m) for m in range(1, 361)]
            # PMI stops the month the loan is at 80% of the price. When the loan lands on that line to the cent (a 0% loan
            # can), which side of it a month falls on is a matter of rounding, so the sums that hold PMI are not compared.
            tie = under and x['pmiPct'] > 0 and any(abs(left(m) - 0.8 * price) < 1e-6 * price for m in range(0, 360))
            if not tie: ck('months of PMI', o['pmiMonths'], sum(1 for _, pmi in outs if pmi > 0), 0)
            once = down + price * x['closingPct'] / 100; sell = 1 - x['sellingPct'] / 100
            first_year, edge = None, False
            for y in range(1, 31):
                if tie: edge = True; break
                T = 12 * y
                fv_buy = once * (1 + ret_m) ** T + sum(outs[m - 1][0] * (1 + ret_m) ** (T - m) for m in range(1, T + 1))
                fv_rent = sum(rent(m) * (1 + ret_m) ** (T - m) for m in range(1, T + 1))
                ahead = (-fv_buy + price * G ** T * sell - left(T)) - (-fv_rent)
                tol = max(1.0, abs(fv_buy) * 1e-9)
                ck(f'ahead after year {y}', o['ahead'][y - 1], ahead, tol)
                ck(f'owning paid by year {y}', o['ownOut'][y - 1], sum(v for v, _ in outs[:T]), tol); ck(f'renting paid by year {y}', o['rentOut'][y - 1], sum(rent(m) for m in range(1, T + 1)), tol)
                if abs(ahead) < 0.01: edge = True
                if first_year is None and ahead >= 0: first_year = y
            if not edge:
                ck('breakeven year', o['year'], first_year, 0); ck('renting cheaper the whole time', o['never'], first_year is None)
            ck('price-to-rent ratio', o['ratio'], price / (x['rent'] * 12), 1e-6); ck('the 5% rule, a month', o['five'], price * 0.05 / 12); ck('rent under the 5% line', o['rentLess'], x['rent'] < price * 0.05 / 12)
        elif fn in ('gigRate', 'gigSetAside', 'gigRetire', 'gigInvoices', 'gigApps'):
            gig_check(fn, x, o, ck, law)
        elif fn in ('qcHysa', 'qcDca', 'qcSmall', 'qcInflation', 'qcStart', 'qcAdd', 'qcJobless', 'qcConsolidate', 'qcLeave', 'qcRoommates', 'qcW4', 'qcGlance'):
            quick_check(fn, x, o, ck, law)
        elif fn == 'careerRoi':
            # Career and education: the price, the raise, the payback and the lifetime value from the definitions; the
            # loan's interest as the level payment whose discounted sum is the loan.
            t = x['taxPct'] / 100; keep = 1 if x['months'] == 0 else x['keepPct'] / 100
            yours = x['cost'] - min(x['help'], x['cost']); loan = min(x['loan'], yours); n = x['loanYears'] * 12; lr = x['loanRatePct'] / 1200
            pay = 0.0 if loan <= 0 else (loan / n if lr == 0 else loan / sum(1 / (1 + lr) ** k for k in range(1, n + 1)))
            interest = pay * n - loan
            lost = x['payBefore'] * x['months'] / 12 * (1 - keep) * (1 - t); total = yours + lost + interest; gain = (x['payAfter'] - x['payBefore']) * (1 - t)
            ck('the whole price', o['total'], total); ck('the raise after tax', o['gainNet'], gain); ck('loan interest', o['interest'], interest); ck('paid now', o['once'], yours - loan)
            ck('payback years', o['payback'], total / gain if gain > 0 else None, 1e-6)
            done = x['age'] + x['months'] / 12; ck('lifetime value', o['lifetime'], gain * max(0, x['endAge'] - done) - total)
            # the move, month by month: the sum of the changes in each month is what the path does to that month
            at = lambda k: sum(c['monthly'] for c in o['changes'] if c['at'] <= k)
            if x['months'] > 0: ck('a month while learning', at(0), -lost / x['months'])
            ck('a month after', at(x['months']), gain / 12 - pay); ck('a month after the loan', at(x['months'] + n), gain / 12)
        elif fn == 'tripLines':
            # Travel: each line from its definition, the card fee on the lines paid in another currency, points off at most the lines
            d = x['days']; nts = x['nights'] if x['nights'] is not None else (max(0, d - 1) if d is not None else None)
            L = {'flights': x['flights'], 'lodging': x['lodging'] * nts if x['lodging'] is not None and nts is not None else None, 'food': x['food'] * d if x['food'] is not None and d is not None else None,
                 'visa': x['visa'], 'insurance': x['insurance'], 'other': x['other']}
            on = x['fxOn'] if x.get('fxOn') is not None else ['lodging', 'food', 'other']
            fx = 0 if not on else (None if x['fxPct'] is None else round(sum(L[k] or 0 for k in on) * x['fxPct'] / 100 + 1e-9, 2))
            vals = [L[k] for k in ('flights', 'lodging', 'food', 'visa', 'insurance', 'other')] + [fx]
            for i, v in enumerate(vals): ck(f'line {i}', o['lines'][i], v, 0.011)
            gross = sum(v for v in vals if v is not None); off = min(x['pointsOff'] or 0, gross)
            ck('gross', o['gross'], gross, 0.011); ck('points off', o['pointsOff'], off, 0.011); ck('total', o['total'], gross - off, 0.02)
            ck('lines open', o['open'], sum(1 for v in vals if v is None), 0); ck('ready', o['ready'], any(L[k] is not None for k in L))
        elif fn == 'tripPoints':
            got = (x['cash'] - x['fees']) / x['points'] * 100; worth = x['points'] * x['cpp'] / 100; spend = worth + x['fees']; keep = x['cash'] - spend
            ck('cents a point', o['got'], got, 1e-9); ck('worth', o['worth'], worth); ck('redeeming spends', o['spend'], spend); ck('kept', o['keep'], keep)
            ck('which leads', o['lead'] == ('same' if abs(keep) < 0.01 else 'points' if keep > 0 else 'cash'), True)
        elif fn == 'tripSplit':
            # every part in cents; each part is its exact share to within a cent, and the parts add up to the whole
            P = x['people']; ids = [p['id'] for p in P]; sh = [p['shares'] if p['shares'] else 1 for p in P]
            if x['how'] == 'item':
                exact = [0.0] * len(P); whole_c = 0
                for it in x['items']:
                    am = [i for i in (it['among'] or []) if i in ids] or ids
                    c = round(it['amount'] * 100); whole_c += c
                    for k, pid in enumerate(ids):
                        if pid in am: exact[k] += c / len(am)
                tol = len(x['items']) + 0.001
            else:
                T = x['total'] if x['total'] is not None else sum(i['amount'] for i in x['items'])
                whole_c = round(T * 100); exact = [whole_c * s / sum(sh) for s in sh]; tol = 1.001
            for k in range(len(P)): ck(f'part {k} in cents', round(o['parts'][k] * 100), exact[k], tol)
            ck('the parts add up', round(sum(o['parts']) * 100), whole_c, 0); ck('total', round(o['total'] * 100), whole_c, 0)
        elif fn == 'tripJourney':
            # the six stages from their definitions; the trip from cash first, then investments; refill months = trip / monthly
            c, db, inv = x['cash'], x['debt'], x['invested']
            w = None if None in (c, db, inv) else c + inv - db
            tr = x['trip']; mo = x['monthly'] if x['monthly'] else None
            fc = None if tr is None or c is None else min(max(0, c), tr)
            aft = None if tr is None else {'cash': None if c is None else c - fc, 'inv': None if inv is None or fc is None else inv - (tr - fc), 'debt': db, 'worth': None if w is None else w - tr}
            def st(i, v):
                have = [v['worth'], v['cash'], v['debt'], v['worth'], v['inv'], v['inv']][i]; tg = [0, 1000, 0, 100000, x['coast'], x['fi']][i]
                if have is None or tg is None: return None, None
                if i == 2: return have <= 0, None
                return have >= tg, max(0, tg - have)
            now = {'cash': c, 'inv': inv, 'debt': db, 'worth': w}; shift = tr / mo if tr is not None and mo else None
            first = None
            for i in range(6):
                done, left = st(i, now)
                ck(f'stage {i} reached', o['done'][i], done)
                m = 0 if done else (math.ceil(left / mo) if left is not None and mo and i in (0, 1, 3) else None)
                ck(f'stage {i} months', o['months'][i], m, 0)
                if first is None and done is False: first = i
                if aft is not None:
                    ad, _ = st(i, aft); ma = 0 if ad else (m + shift if m is not None and shift is not None else None)
                    ck(f'stage {i} after the trip', o['after'][i][0], ad); ck(f'stage {i} months after', o['after'][i][1], ma, 1e-6)
            unknown = any(st(i, now)[0] is None for i in range(6))
            ck('where you are', o['here'], first if first is not None else (None if unknown else 6), 0)
            ck('from cash', o['fromCash'], fc); ck('months of saving', o['shift'], shift, 1e-9)
        elif fn == 'careerStack':
            L = x['list']; months = lambda s: int(s[:4]) * 12 + int(s[5:7])
            sets = [set(range(months(c['from']), months(c['to']) + 1)) for c in L]
            ov = sorted([sorted([L[i]['name'], L[j]['name']]) + [len(sets[i] & sets[j])] for i in range(len(L)) for j in range(i + 1, len(L)) if sets[i] & sets[j]])
            ck('the overlaps', sorted([sorted(p[:2]) + [p[2]] for p in o['overlaps']]) == ov, True)
            ck('busy months', o['busy'], len(set().union(*sets)), 0); ck('span', o['span'], max(months(c['to']) for c in L) - min(months(c['from']) for c in L) + 1, 0)
            ck('cost', o['cost'], sum(c['cost'] or 0 for c in L)); ck('raise', o['raise'], sum(c['raise'] or 0 for c in L))
        elif fn == 'careerVest':
            y = x['years']
            pct = {'now': 100, 'cliff3': 100 if y >= 3 else 0, 'graded6': 0 if y < 2 else min(100, 20 * (int(y) - 1))}[x['schedule']]
            ck('% vested', o['pct'], pct, 0); ck('left behind', o['left'], x['match'] * (100 - pct) / 100)
            nxt = None if pct >= 100 else (3 if x['schedule'] == 'cliff3' else max(2, int(y) + 1))
            if nxt is None: ck('no next step', o['more'] is None, True)
            else:
                npct = 100 if x['schedule'] == 'cliff3' else 20 * (nxt - 1)
                ck('more at the next step', o['more'], x['match'] * (npct - pct) / 100); ck('months to it', o['months'], math.ceil((nxt - y) * 12 - 1e-9), 0)
        elif fn == 'careerLaunch':
            ck('job hop a month', o['hop'], x['raise'] * (1 - x['taxPct'] / 100) / 12); ck('left behind', o['hopOnce'], x['left'])
            ck('traditional next to Roth a month', o['roth'], x['yearly'] * (x['nowPct'] - x['laterPct']) / 1200); ck('house hack a month', o['hack'], x['rent'] - x['costs']); ck('house hack months', o['hackMonths'], x['years'] * 12, 0)
        elif fn == 'jobRoles':
            a = x
            def hv(k, v): return v in (a.get(k) or [])
            def notn(k, *no): return bool(a.get(k)) and a.get(k) not in no
            pr = a.get('prot') or {}
            sig = {
                'cfo': [a.get('steady') == 'Changes month to month', notn('share', 'No one'), notn('deps', 'None'), a['debts'] > 0, a['goals'] > 0],
                'accountant': [hv('incKinds', 'Side gigs') or hv('incKinds', 'My own business') or a['work'] in ('Self-employed', 'A few jobs or gigs'), len(a['incKinds']) >= 2, a['home'] == 'Owning', notn('invest', 'No'), len(a['accts']) >= 3],
                'planner': [notn('invest', 'No'), hv('accts', 'Retirement plan at work') or hv('accts', 'IRA or Roth IRA'), a['goals'] > 0, a['deps'] == 'Kids' or hv('live', 'Kids') or a['kids'] > 0, a['age'] >= 50],
                'insurance': [a['home'] == 'Owning', a['home'] == 'Renting', hv('debtKinds', 'Car loan'), notn('deps', 'None', 'Pets'), any(pr.get(k) == 'Yes' for k in ('renters', 'life', 'disab'))],
                'health': [hv('accts', 'HSA'), bool(pr.get('health')) and pr.get('health') != 'None right now', a['deps'] == 'Kids' or hv('live', 'Kids') or a['kids'] > 0, a['deps'] == 'Supporting a parent' or hv('live', 'Parents or family'), hv('debtKinds', 'Medical bills')],
                'deals': [hv('debtKinds', 'Credit card balance') or a['cards'] > 0, a['banks'] >= 2, hv('live', 'Roommates'), a['home'] in ('Renting', 'Owning')],
            }
            ids = ['cfo', 'accountant', 'planner', 'insurance', 'health', 'deals']
            sc = {i: 1 + sum(1 for v in sig[i] if v) for i in ids}
            order = sorted(ids, key=lambda i: (-sc[i], ids.index(i)))
            for i in ids: ck('score ' + i, o['scores'][i], sc[i], 0)
            ck('the order', o['order'] == order, True)
        elif fn == 'jobLiving':
            ids = ['cfo', 'accountant', 'planner', 'insurance', 'health', 'deals']
            dflt = {'cfo': 60, 'accountant': 60, 'planner': 15, 'insurance': 15, 'health': 15, 'deals': 15}
            mins, cfs = {}, []
            for i in ids:
                m = x['mins'].get(i)
                if m is not None and m.get('v') is not None: mins[i] = m['v']; cfs.append(m.get('cf') or 2)
                else: mins[i] = dflt[i]; cfs.append(1)
            total = sum(mins.values())
            st = 'Guess' if any(c <= 1 for c in cfs) else ('Exact' if all(c >= 3 for c in cfs) else 'Close')
            raw = {i: 0.0 for i in ids}
            for t in x['tasks']:
                if x['exits'].get(t['id']) in ('auto', 'hand', 'drop'): raw[t['role']] += t['per'] * t['times'] / 12
            living = sum(min(raw[i], mins[i]) for i in ids)
            pct = living / total * 100 if total > 0 else 0
            better = max(1, int(math.floor(pct + 0.5))) if living > 0 else 0
            ck('total', o['total'], total, 0); ck('state', o['st'] == st, True); ck('living', o['living'], living, 1e-9); ck('running', o['running'], max(0, total - living), 1e-9); ck('better', o['better'], better, 0)
            for k, t in enumerate(x['tasks']): ck('monthly ' + t['id'], o['monthly'][k], t['per'] * t['times'] / 12, 1e-9)
        elif fn == 'enCreep':
            # by months first: each month's total, then each year is the months that hold spending
            out_m, inc_y, cat_y = defaultdict(float), defaultdict(float), defaultdict(lambda: defaultdict(float))
            months_y, has_inc = defaultdict(set), set()
            for r in x['rows']:
                y, ym = r['d'][:4], r['d'][:7]
                if r['kind'] == 'in': inc_y[y] += r['amt']; has_inc.add(y); continue
                out_m[ym] += r['amt']; months_y[y].add(ym); cat_y[y][r['cat']] += r['amt']
            years = sorted(y for y in months_y if len(months_y[y]) >= 3)
            if len(years) < 2:
                ck('not ready', o['ready'], False)
            else:
                p_, n_ = years[-2], years[-1]
                mp, mn = len(months_y[p_]), len(months_y[n_])
                sp, sn = sum(v for k, v in out_m.items() if k[:4] == p_) / mp, sum(v for k, v in out_m.items() if k[:4] == n_) / mn
                ck('years', o['prev'] * 10000 + o['now'], int(p_) * 10000 + int(n_), 0)
                g = sn / sp - 1 if sp > 0 else None
                ck('spending growth', o['spendGrowth'], g, 1e-6)
                ip = inc_y[p_] / mp if p_ in has_inc else None; inn = inc_y[n_] / mn if n_ in has_inc else None
                ig = inn / ip - 1 if ip and inn is not None and ip > 0 else x['incomeGrowth']
                ck('income growth', o['income'], ig, 1e-6)
                alert = g is not None and ig is not None and g > 0 and g > ig
                ck('the alert', o['alert'], alert)
                if alert: ck('the gap a month', o['gap'], sn - sp * (1 + ig), 0.02)
                infl = x['inflation']
                for c in o['cats']:
                    was = cat_y[p_].get(c['cat'], 0) / mp if c['cat'] in cat_y[p_] else 0
                    is_ = cat_y[n_].get(c['cat'], 0) / mn if c['cat'] in cat_y[n_] else 0
                    ck('a category last year', c['was'], was, 0.011); ck('a category this year', c['is'], is_, 0.011)
                    over = None if infl is None or not was > 0 else is_ - was * (1 + infl)
                    ck('past inflation', c['over'], over, 0.02)
                    mut = over is not None and is_ / was - 1 > infl and over >= 10 - 0.005
                    ck('faster than prices', c['mutant'], mut)
        elif fn == 'enPareto':
            L = sorted([l['amt'] for l in x['lines'] if l['amt'] > 0], reverse=True)
            if len(L) < 3: ck('not ready', o['ready'], False)
            else:
                tot = sum(L); k = 0; run_ = 0
                while run_ < 0.8 * tot - 1e-9: run_ += L[k]; k += 1
                ck('the few lines', o['count'], k, 0); ck('total', o['total'], tot, 0.02); ck('their total', o['topTotal'], run_, 0.02)
        elif fn == 'enEnough':
            if x['fi'] is None: ck('no number', o['value'], None)
            else:
                val = x['fi'] * x['share']; room = val * (1 + x['room']) if x['room'] is not None else None
                ck('enough number', o['value'], val, 0.02); ck('with room', o['withRoom'], room, 0.02)
                if x['have'] is not None: ck('left', o['left'], max(0, (room if room is not None else val) - x['have']), 0.02); ck('past', o['past'], x['have'] >= val - 0.005)
        elif fn == 'enRough':
            v = x['v']; a = abs(v)
            def short(n): return f"${n // 1000000}M" if n >= 1000000 and n % 1000000 == 0 else (f"${n / 1000000:g}M" if n >= 1000000 else (f"${n // 1000}k" if n % 1000 == 0 and n >= 1000 else (f"${n / 1000:g}k" if n >= 1000 else f"${n}")))
            if a < 0.5: want = '$0'
            else:
                if a < 100: lo, hi = 0, 100
                else:
                    p10 = 10 ** (len(str(int(a))) - 1); lo = (int(a) // p10) * p10; hi = lo + p10
                want = f"{short(lo)} to {short(hi)}" if v >= 0 else f"-{short(lo)} to -{short(hi)}"
            ck('the range', o['text'] == want, True)
        elif fn == 'enStepCreep':
            a, b = x['a'], x['b']; sg = b['spend'] / a['spend'] - 1; tg = b['take'] / a['take'] - 1 if a['take'] > 0 else None
            ck('creep between two looks', o['up'], sg >= 0.05 and (tg is None or tg < sg))
        elif fn == 'jobCarry':
            # by people, not by jobs: each person gathers their part of each job and of each task handed to them
            ids = ['cfo', 'accountant', 'planner', 'insurance', 'health', 'deals']
            dflt = {'cfo': 60, 'accountant': 60, 'planner': 15, 'insurance': 15, 'health': 15, 'deals': 15}
            jm = {i: (x['mins'][i]['v'] if x['mins'].get(i) is not None and x['mins'][i].get('v') is not None else dflt[i]) for i in ids}
            hv = x['hv']; rate = hv['tp'] if (hv['tp'] or 0) > 0 else (hv['wage'] if hv['wage'] > 0 else None)
            ck('rate', o['rate'], rate)
            off = lambda t: x['exits'].get(t['id']) in ('auto', 'hand', 'drop')
            mo = lambda t: t['per'] * t['times'] / 12
            got = []
            for k in x['keys']:
                m = 0.0
                for i in ids:
                    raw = sum(mo(t) for t in x['tasks'] if t['role'] == i and off(t))
                    left = jm[i] - min(raw, jm[i])
                    hold = []
                    for h in x['assign'].get(i, []):
                        if h in x['keys'] and h not in hold: hold.append(h)
                    if not hold: hold = [x['keys'][0]]
                    if k in hold: m += left / len(hold)
                    for t in x['tasks']:
                        if t['role'] == i and x['exits'].get(t['id']) == 'hand' and x['hands'].get(t['id']) == k:
                            m += mo(t) * (min(raw, jm[i]) / raw)
                got.append(m)
            for n, m in enumerate(got): ck('minutes of ' + x['keys'][n], o['min'][n], m, 1e-9)
            ck('household', o['total'], sum(got), 1e-9)
            ck('value', o['value'], None if rate is None else sum(got) / 60 * rate, 1e-6)
            for n, m in enumerate(got): ck('value of ' + x['keys'][n], o['val'][n], None if rate is None else m / 60 * rate, 1e-6)
        elif fn == 'jobWire':
            t = 12 if x['day'] in ('d1', 'd15') else 24 if x['day'] == '1and15' else (x['pay'] if x['pay'] > 0 else 12)
            ck('deposits a year', o['times'], t, 0)
            per = None if not (x['monthly'] > 0) else int(math.ceil(x['monthly'] * 12 / t - 1e-9))
            ck('each deposit', o['per'], per, 0)
        elif fn == 'jobCheck':
            import datetime, calendar
            base = datetime.date.fromisoformat(x['last'] or x['set'])
            mo = base.month - 1 + 3; Y = base.year + mo // 12; M = mo % 12 + 1
            nx = datetime.date(Y, M, min(base.day, calendar.monthrange(Y, M)[1])).isoformat()
            ck('next check-in', o['next'] == nx, True); ck('due', o['due'] == (x['today'] >= nx), True)
        elif fn == 'jobDate':
            import datetime, calendar
            mm, dd = int(x['md'][:2]), int(x['md'][3:]); td = datetime.date.fromisoformat(x['today'])
            at = lambda Y: datetime.date(Y, mm, min(dd, calendar.monthrange(Y, mm)[1]))
            d = at(td.year) if at(td.year) >= td else at(td.year + 1)
            ck('the next date', o['date'] == d.isoformat(), True); ck('days to go', o['days'], (d - td).days, 0); ck('reminder open', o['open'] == ((d - td).days <= x['lead']), True)
        elif fn == 'rcSafeLine':
            sp = x['spent'] or 0
            ck('left', o['left'], max(0, x['cap'] - sp)); ck('over', o['over'], max(0, sp - x['cap'])); ck('ran out', o['ranOut'], x['spent'] is not None and sp >= x['cap']); ck('plan cost', o['planCost'], x['cap'])
        elif fn == 'rcAudit':
            ev = [e for e in x['events'] if e['amount'] is not None]
            mis = [e for e in ev if e['tag'] == 'mistake']; una = [e for e in ev if e['tag'] == 'unavoidable']
            later = lambda e: e['amount'] * math.exp((x['years'] + e['yearsAgo']) * math.log(1 + x['realReturn']))   # by logs, not by a power
            ck('count', o['mCount'], len(mis), 0); ck('cost then', o['mCost'], sum(e['amount'] for e in mis)); ck('cost over time', o['mLater'], sum(later(e) for e in mis))
            saving = x['perDay'] is not None and x['perDay'] > 0   # the guard: no FI days when a day of saving is zero or less
            ck('days of saving', o['mDays'], sum(e['amount'] for e in mis) / x['perDay'] if saving else None, 1e-6); ck('hours', o['mHours'], sum(e['amount'] for e in mis) / x['hourly'], 1e-6)
            ck('the measure is FI days', o['measure'] == 'fiDays', saving); ck('the measure is hours of work', o['measure'] == 'hours', not saving)
            ck('unavoidable then', o['uCost'], sum(e['amount'] for e in una)); ck('unavoidable over time', o['uLater'], sum(later(e) for e in una))
            ck('untagged', o['untagged'], sum(1 for e in x['events'] if e['tag'] is None), 0); ck('open', o['open'], sum(1 for e in x['events'] if e['amount'] is None), 0)
            ck('share of a year of pay', o['tax'], sum(e['amount'] for e in mis if e['yearsAgo'] < 1) / x['yearIncome'], 1e-9)
            by = defaultdict(list)
            for e in mis: by[e['kind']].append(e['amount'])
            rep = {k: v for k, v in by.items() if len(v) >= 2}
            ck('repeats', o['repeats'], len(rep), 0); ck('repeat cost', o['repeatCost'], sum(sum(v) for v in rep.values()))
        elif fn == 'habit':
            # each payment grown on its own to the end, then added up (no annuity formula)
            n = 52 if x['per'] == 'week' else 12
            total = sum(x['amount'] * (1 + rr) ** (k / n) for k in range(n * x['years']))
            ck('grown', o['grown'], total); ck('spent', o['spent'], x['amount'] * n * x['years']); ck('needed to pay for it forever', o['needs'], x['amount'] * n / wr)
            ck('times the cost', o['times'], total / x['amount'], 1e-6)
        elif fn == 'loan':
            # the payment by the present-value sum (each payment discounted on its own), then every month stepped
            n, r = x['years'] * 12, x['apr'] / 12
            pay = x['amount'] / sum((1 + r) ** -k for k in range(1, n + 1))
            left, interest, today, infl = x['amount'], 0.0, 0.0, ref['presets']['inflation']['default']
            for k in range(1, n + 1):
                i = left * r
                interest += i; today += i / (1 + infl) ** (k / 12); left += i - pay
            ck('payment', o['payment'], pay); ck('paid in all', o['paid'], x['amount'] + interest); ck('interest', o['interest'], interest)
            ck('interest in today\'s dollars', o['interestToday'], today)
            ck('the payment invested', o['invested'], sum(pay * (1 + rr) ** (k / 12) for k in range(n)))
            ck('in FI terms', o['fiNumber'], pay * 12 / wr)
        elif fn == 'ladder':
            # with no pay, no card and no benefits, everything held is simply spent down: months = what is held / spending
            held = x['checking'] + x['savings'] + x['invested']
            ck('held across the rungs', o['held'], held)
            months = held / x['spending']
            ck('months it lasts', o['runway'], months if months < LADDER_MAX else None, 1e-6)
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
        elif fn == 'vpwShare':
            ck('share', o['share'], vpw_share(x['age'], x['stock']), 1e-9)
        elif fn == 'spendDown':
            ck('payment', o['payment'], spend_down(x['start'], x['target'], x['n'], x['g']), 0.01)
        elif fn == 'wayPath':
            # one pile of money through one way, as the game's replay does it: the rule, how it is held, when it comes out
            way, p, mem, last, last_i = x['way'], x['start'], {}, None, None
            for k, (y, theirs) in enumerate(zip(x['seq'], o['rows'])):
                age = x['age'] + k
                spend, aim = way_spend(way, {'need': x['need'], 'start': p, 'k': k, 'age': age, 'endAge': x['age'] + len(x['seq']) - 1, 'last': last, 'infl': last_i, 'cape': y.get('cape'), 'stock': x['stock'], 'growth': x['growth']}, mem)
                w = spend if way.get('gross') else max(0.0, spend - (x['income'] if age >= x['incomeAge'] else 0))
                r = x['stock'] * y['s'] + (1 - x['stock']) * y['b']
                if way.get('hold'):
                    r = way_return(way, {'r': r, 's': y['s'], 'b': y['b'], 'dy': y.get('dy'), 'by': y.get('by')}, {'stock': x['stock'], 'k': k, 'last': last, 'start': p, 'w': w}, mem)
                p, short = way_pay(p, w, r, way.get('timing') or 'start')
                if not (ck(f'spend in year {k}', theirs[0], spend, 0.01) and ck(f'aim in year {k}', theirs[1], aim, 0.01) and ck(f'short in year {k}', theirs[2], short, 0.01) and ck(f'money after year {k}', theirs[3], p, 0.01)):
                    break
                last, last_i = r, y.get('i')
        elif fn == 'wayLife':
            audit = []
            mine = whole_life(x, law, audit)
            for name in ('ok', 'ranOutAge', 'atRetire', 'end', 'lifetimeTax', 'penalties'):
                ck(name, o[name], mine[name])
            ck('lowest share of the aim', o['lowestPaid'], mine['lowestPaid'], 1e-6); ck('years with a cut', o['cutYears'], mine['cutYears'], 0); ck('year-one spending', o['firstSpend'], mine['firstSpend'])
            ck('works', o['worked'], mine['ok'] and mine['lowestPaid'] >= way_tolerance(x['strategy']))
            cols = ['age', 'total', 'tax', 'spend', 'withdraw', 'convert', 'penalty', 'short', 'taxable', 'pretax', 'roth']
            for a, m in zip(o['years'], mine['years']):
                for j in range(1, 11):
                    if not ck(f'{cols[j]} at {a[0]}', a[j], m[j]):
                        break
            L = extra['life']; L['runs'] += 1
            for y in audit:
                L['years'] += 1
                if abs(y['tax_gap']) > 1 and not y['short']:
                    L['tax_gap_years'] += 1
                    if abs(y['tax_gap']) > abs(L['worst_tax_gap']):
                        L['worst_tax_gap'] = y['tax_gap']; L['worst_tax_case'] = {'age': y['age'], 'input': x}
        elif fn == 'wayHistory':
            mine = way_history(x['cycles'], x['tolerate'])
            for name in ('n', 'ok', 'worst', 'cutsWorst'):
                ck(name, o[name], mine[name], 0)
            ck('deepest', o['deepest'], mine['deepest'], 1e-9); ck('median end', o['medianEnd'], mine['medianEnd'], 0.01)
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
    il_path = os.path.join(os.path.dirname(os.path.abspath(ref_path)), 'sources', 'israel-2026.json')  # Aliyah Math reads its own dated file
    R, extra = run(data['cases'], ref, json.load(open(il_path)) if os.path.exists(il_path) else None)
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
