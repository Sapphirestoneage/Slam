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


def own_check(fn, x, o, ck, ref):
    """Your own path (M8P), worked out again from the definitions: the deductible, coinsurance and out-of-pocket max
    one dollar at a time, the fees step by step, the two sides and the two jobs added up, the Rule of 5 plus the added
    months, the adoption credit's straight-line phase-out, and care by the year."""
    def save(need, saved, monthly):
        left = max(0.0, need - saved)
        months = 0 if left <= 0 else (math.ceil(left / monthly - 1e-9) if monthly else None)
        return left, months
    if fn == 'opTransition':
        c = x['covered']; paid = x['metSoFar']; you = 0.0
        if c > 0:
            ded = max(0.0, x['deductible'] - paid); steps = 100; per = c / steps
            for _ in range(steps):  # each slice of the bill: from the deductible first, then the share, until the max
                d = min(per, ded); ded -= d; part = d + (per - d) * x['coinsurance']
                cap = math.inf if x['oopMax'] is None else max(0.0, x['oopMax'] - paid - you)
                you += min(part, cap)
        before = you + x['notCovered']; yours = before - min(x['help'], before)
        left, months = save(yours, x['saved'], x['monthly'])
        ck('the plan pays', o['plan'], c - you, 0.01); ck('yours', o['yours'], yours, 0.01); ck('left', o['left'], left, 0.01); ck('months', o['months'], months, 0)
    elif fn == 'opPapers':
        F, own, tot, dated, add = ref['idChangeNY'], x['own'], 0.0, 0.0, 0
        def step(v, d):
            nonlocal tot, dated, add
            if v is None: add += 1; return
            tot += v; dated += v if d else 0
        step({'nyc': F['courtNyc'], 'ny': F['courtNyState']}.get(x['court'], own['court']), x['court'] != 'other')
        step(own['orderCopies'], False)
        step(F['birthNys'] + x['copies'] * F['birthNysCopy'] if x['born'] == 'nys' else own['birth'], x['born'] == 'nys')
        step(F['ssaCard'], True)
        if x['id'] != 'none': step(F['dmvLicense'] if x['id'] == 'license' else F['dmvId'], True)
        if x['passport'] != 'none': step({'within': F['passportCorrection'], 'renew': F['passportBook'], 'new': F['passportBook'] + F['passportExecution']}[x['passport']], True)
        if own['other']: step(own['other'], False)
        ck('total', o['total'], tot, 0.001); ck('from the offices', o['dated'], dated, 0.001); ck('steps to add', o['toAdd'], add, 0)
    elif fn == 'opTwoSides':
        q = x['quietMonthly'] * 12 * x['years'] + x['quietOnce']; w = x['outMonthly'] * 12 * x['years'] + x['outOnce']
        ck('quiet', o['quiet'], q); ck('out', o['out'], w); ck('apart', o['gap'], abs(q - w))
    elif fn == 'opPackage':
        tot = lambda j: j['pay'] + j['health'] * 12 + j['care'] + j['family'] + j['other']
        a, b = tot(x['now']), tot(x['next'])
        ck('now', o['now'], a); ck('new', o['next'], b); ck('gap', o['gap'], a - b); ck('pay to match', o['match'], x['next']['pay'] + a - b if a > b else None)
    elif fn == 'opSearchFund':
        base = x['age'] / 5 * x['spending']; target = base + x['extraMonths'] * x['spending']
        ck('usual target', o['base'], base); ck('with the longer search', o['target'], target); ck('to go', o['gap'], None if x['cash'] is None else max(0.0, target - x['cash']))
    elif fn == 'opFamily':
        R = ref['adoptionCredit']; paid = min(x['cost'], x['insurance'] + x['employer']); yours = x['cost'] - paid
        credit = refund = None
        if x['path'] == 'adoption':
            m = x['magi']; share = 1.0 if m is None or m <= R['phaseStart'] else 0.0 if m >= R['phaseEnd'] else (R['phaseEnd'] - m) / (R['phaseEnd'] - R['phaseStart'])
            credit = min(max(0.0, x['cost'] - x['employer']), R['max']) * share; refund = min(credit, R['refundable'])
        ck('yours', o['yours'], yours); ck('adoption credit', o['credit'], credit, 0.01); ck('refundable part', o['refundable'], refund, 0.01)
        ck('months', o['months'], save(yours, x['saved'], x['monthly'])[1], 0)
    elif fn == 'opAgeCare':
        need = max(0.0, x['monthly'] - x['covered']) * 12 * x['years']; left = max(0.0, need - x['saved'])
        ck('need', o['need'], need); ck('left', o['left'], left); ck('a month', o['perMonth'], left / (x['yearsUntil'] * 12) if x['yearsUntil'] else None, 0.01)
def hard_check(fn, x, o, ck):
    """Hard moments (M8H), worked out again from the definitions: the shares by hand (room size, income or equal),
    the person leaving paying the months agreed and the people staying taking the whole rent after; untangling item by item."""
    if fn == 'hmRoommateExit':
        def shares(ps, way):
            if way == 'size':
                t = sum(p['size'] for p in ps); return [p['size'] / t for p in ps]
            if way == 'income':
                t = sum(p['income'] for p in ps); return [p['income'] / t for p in ps] if t > 0 else [1 / len(ps)] * len(ps)
            return [1 / len(ps)] * len(ps)
        ps, bway = x['people'], (x['how'] if x['billsHow'] == 'same' else 'equal')
        stay = [p for p in ps if p['id'] != x['leaver']]
        r0, b0 = shares(ps, x['how']), shares(ps, bway)
        r1, b1 = shares(stay, x['how']), shares(stay, bway)
        M = x['monthsLeft']; cov = min(M, max(0, x['cover'])); rest = M - cov
        back = max(0.0, x['deposit'] - x['damage'])
        total = 0.0
        for i, p in enumerate(ps):
            now = x['rent'] * r0[i] + x['bills'] * b0[i]
            j = next((k for k, q in enumerate(stay) if q['id'] == p['id']), None)
            later = 0.0 if j is None else x['rent'] * r1[j] + x['bills'] * b1[j]
            to_end = now * cov if j is None else now * cov + later * rest
            total += to_end
            ck(f'person {i + 1} now', o['now'][i], now, 1e-6); ck(f'person {i + 1} later', o['later'][i], later, 1e-6)
            ck(f'person {i + 1} to the end', o['toEnd'][i], to_end, 1e-6); ck(f'person {i + 1} deposit back', o['deposit'][i], back * r0[i], 1e-6)
            if j is None: ck('left uncovered', o['uncovered'], now * rest, 1e-6)
        ck('the whole lease', o['total'], (x['rent'] + x['bills']) * M, 1e-6); ck('the sum of the people', o['total'], total, 1e-6)
    elif fn == 'hmUntangle':
        s = x['share']; mine = {'have': 0.0, 'owe': 0.0}; theirs = {'have': 0.0, 'owe': 0.0}; op = []; op_amt = 0.0; both = []; both_amt = 0.0
        for it in x['items']:
            plan = None if it['plan'] in (None, 'none') else it['plan']; a = it['amount']
            part = {'me': 1.0, 'them': 0.0, 'split': s, 'sell': s}.get(plan)
            if a is not None and part is not None:
                mine[it['kind']] += a * part; theirs[it['kind']] += a * (1 - part)
            if plan is None:
                op.append(it['id'])
                if a is not None: op_amt += -a if it['kind'] == 'owe' else a
            if it['kind'] == 'owe' and it['names'] == 'both' and plan != 'sell':
                both.append(it['id'])
                if a is not None: both_amt += a
        for k, v in (('mine', mine), ('theirs', theirs)):
            ck(f'{k} kept', o[k][0], v['have'], 1e-6); ck(f'{k} owed', o[k][1], v['owe'], 1e-6); ck(f'{k} net', o[k][2], v['have'] - v['owe'], 1e-6)
        ck('still to decide', o['open'] == op, True); ck('still to decide, the amount', o['openAmount'], op_amt, 1e-6)
        ck('still in both names', o['stillBoth'] == both, True); ck('still in both names, the amount', o['stillBothAmount'], both_amt, 1e-6)
        a, sp = x['park']; ck('months it waits', o['park'], a / sp, 1e-9)



def estate_check(fn, x, o, ck, law):
    """Estate and marriage (M8E), worked out again from the definitions: each thing's parts by hand, the step-up as
    value less what was paid, the heir's rule from the IRS list, the two estate lines; the 10 years year by year with
    this engine's own federal tax; married or partners from the single and joint tables and half the other's amount."""
    if fn == 'esHeirs':
        R = x['rules']; ids = [p['id'] for p in x['people']]
        gets = {i: 0.0 for i in ids}; pre = {i: 0.0 for i in ids}; er = {i: 0.0 for i in ids}; roth = {i: 0.0 for i in ids}
        heir = {p['id']: p['heir'] for p in x['people']}
        total = 0.0; unassigned = 0.0; spouse = 0.0
        for it in x['items']:
            v = it['value']
            if v is None: continue
            total += v
            parts = {k: w for k, w in it['to'].items() if w > 0 and k in gets}
            t = sum(parts.values())
            if not t: unassigned += v; continue
            for k, w in parts.items():
                a = v * w / t; gets[k] += a
                if it['kind'] in ('taxable', 'home') and it['basis'] is not None: er[k] += max(0.0, v - it['basis']) * w / t
                if it['kind'] == 'pretax': pre[k] += a
                if it['kind'] == 'roth': roth[k] += a
                if heir[k] == 'spouse': spouse += a
        ck('everything', o['total'], total, 1e-6); ck('given to someone', o['assigned'], total - unassigned, 1e-6); ck('step-up, all', o['erased'], sum(er.values()), 1e-6)
        for n, i in enumerate(ids):
            ck(f'person {n} gets', o['gets'][n], gets[i], 1e-6); ck(f'person {n} traditional', o['pre'][n], pre[i], 1e-6); ck(f'person {n} step-up', o['er'][n], er[i], 1e-6)
            ten = heir[i] not in ('spouse', 'close', 'disabled', 'child') and pre[i] + roth[i] > 0
            ck(f'person {n} last year', o['last'][n], x['deathYear'] + R['tenYears'] if ten else None)
            ck(f'person {n} yearly', o['yearly'][n], bool(ten and x['started'] and pre[i] > 0))
        base = total - spouse; ck('federal base', o['fedBase'], base, 1e-6)
        ck('federal line', o['fed'] == ('over' if base > R['federalExclusion'] else 'under'), True)
        ny = R['nyExclusion']; ck('New York line', o['ny'] == ('over' if total > ny * R['nyCliffShare'] else 'cliff' if total > ny else 'under'), True)
    elif fn == 'esTenYear':
        tax = lambda g: law.federal(g, 0, x['status'])[0]
        base = tax(x['other'])
        for w in ('first', 'even', 'last'):
            b = x['balance']; outs = []
            for k in range(1, 11):
                b *= 1 + x['growth']
                out = (b if k == 1 else 0.0) if w == 'first' else (b if k == 10 else 0.0) if w == 'last' else b / (11 - k)
                b -= out; outs.append(out)
            t = sum(tax(x['other'] + q) - base for q in outs if q > 0)
            ck(f'{w}: out', o[w]['out'], sum(outs), 1e-4); ck(f'{w}: tax', o[w]['tax'], t, 1e-4)
            ck(f'{w}: each year', all(abs(a - b) < 1e-6 for a, b in zip(o[w]['rows'], outs)), True)
            ck(f'{w}: open', o[w]['ready'], not (w == 'last' and x['started']))
    elif fn == 'esCompare':
        p = x['people']; tax = lambda g, s: law.federal(g, 0, s)[0]
        single = [tax(q['pay'], 'single') for q in p]
        by = x['coverBy']; cov = tax(p[by]['pay'] + x['cover'], 'single') - single[by] if x['cover'] > 0 else 0.0
        joint = tax(p[0]['pay'] + p[1]['pay'], 'joint')
        ck('single 1', o['single'][0], single[0], 1e-6); ck('single 2', o['single'][1], single[1], 1e-6); ck('joint', o['joint'], joint, 1e-6)
        ck('cover tax', o['coverTax'], cov, 1e-6); ck('difference', o['diff'], single[0] + single[1] + cov - joint, 1e-6)
        if p[0]['pia'] is not None and p[1]['pia'] is not None:
            for i in (0, 1):
                ck(f'spousal {i}', o['spousal'][i], max(0.0, 0.5 * p[1 - i]['pia'] - p[i]['pia']), 1e-6)
                ck(f'survivor {i}', o['survivor'][i], max(p[0]['pia'], p[1]['pia']), 1e-6)
        else:
            ck('no Social Security', o['spousal'], None)

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
    elif fn == 'gigSafeHarbor':
        # IRS 2026 Form 1040-ES: the smaller of 90% of this year and 100% (110% over the AGI line, or not sure) of last
        # year, less withholding, a quarter by each date; none with $0 tax last year (12 months) or under $1,000 due.
        R, T, w, p = x['rule'], x['thisYear'], x['withheld'], x['paid']
        full = x['lastFull'] is not False
        share = R['prior'] if x['lastAgiOver'] is False else R['priorHigh']
        prior = share * x['lastYear'] if x['lastYear'] is not None and full else None
        none = 'zero' if (x['lastYear'] == 0 and x['lastYear'] is not None and full) else ('small' if T - w < R['owe'] else None)
        req = 0 if none == 'zero' else (R['current'] * T if prior is None else min(R['current'] * T, prior))
        need = 0 if none else max(0.0, req - w)
        passed = sum(1 for d in x['due'] if d < x['today'])
        by_next = need * (passed + 1) / 4 if passed < 4 else need
        ck('safe harbor need', o['need'], need); ck('required', o['required'], req); ck('none', o['none'] == none, True)
        ck('by now', o['byNow'], need * passed / 4); ck('to the next date', o['toNext'], max(0.0, by_next - p)); ck('to owe nothing', o['fullYear'], max(0.0, T - w - p))
    elif fn == 'gigPayouts':
        cyc = {'day': 1, 'week': 7, 'month': 30}
        rows = sorted([a for a in x['apps'] if a['earned'] > 0], key=lambda a: -a['earned'])
        tot = None
        for i, a in enumerate(rows):
            own = x['platforms'].get(a['name'], {}).get('own')
            hold = a['hold'] if a['hold'] is not None else (own['holdDays'] if own else None)
            pay = a['payout'] or (own['payout'] if own else None)
            win = hold + cyc[pay] if hold is not None and pay in cyc else None
            exp = max(0, a['earned'] - a['fee'])
            mx = exp * min(1, win / x['stretchDays']) if win is not None else None
            gap = None if a['landed'] is None else exp - a['landed']
            st = 'waiting' if gap is None else 'matches' if abs(gap) < 1 else ('onway' if gap > 0 and mx is not None and gap <= mx + 0.5 else 'short' if gap > 0 else 'over')
            q = o['rows'][i]
            ck(f'row {i} earned', q['earned'], a['earned']); ck(f'row {i} window', q['window'], win, 0); ck(f'row {i} on its way', q['onWayMax'], mx); ck(f'row {i} state', q['state'] == st, True)
            if mx is not None: tot = (tot or 0) + mx
        ck('on its way in all', o['onWayMax'], tot)
    elif fn == 'gigVsFloor':
        if x['pay'] is None:
            ck('no gig pay, no answer', o['gap'], None)
        else:
            ck('gap an hour', o['gap'], x['pay'] - x['floor'], 1e-9); ck('share of the floor', o['share'], x['pay'] / x['floor'], 1e-12)
            ck('paid hours at the gig', o['hoursMonth'], x['month'] / x['pay'], 1e-9); ck('paid hours at the floor', o['floorHoursMonth'], x['month'] / x['floor'], 1e-9)


def quest_check(fn, x, o, ck):
    """Quest mode (M8Z), worked out again from the rules as written in words (QS_RULES)."""
    clamp = lambda v, lo, hi: max(lo, min(hi, v))
    js_round = lambda v: math.floor(v + 0.5)  # Math.round
    score = lambda h, f: None if f is None or f <= 0 or h is None else int(js_round(clamp(h / f * 100, 0, 100)))
    if fn == 'qsStats':
        months = x['cash'] / x['spend'] if x['spend'] > 0 else None
        ck('health', o['health'], score(months, x['target']), 0); ck('armor', o['armor'], score(x['protDone'], x['protMax']), 0)
        S = o['stats']; rate = (x['take'] - x['spend']) / x['take']
        ck('margin', S['margin'], score(max(0, rate), 0.5), 0)
        ck('reach', S['reach'], score(max(0, x['nw'] / x['fi']), 1), 0)
        ck('lightness', S['light'], int(js_round(100 * (1 - min(1, x['hiDebt'] / (x['take'] * 12))))), 0)
        ck('coast', S['coast'], score(x['inv'] / x['coast'], 1), 0); ck('clarity', S['clarity'], score(x['sharp'], x['sharpOf']), 0); ck('rhythm', S['rhythm'], score(x['streak'], 12), 0)
    elif fn == 'qsCapacity':
        free = x['take'] - x['spend']; share = free / x['take']
        n = 0 if free <= 0 else 1 if share < 0.05 else 2 if share < 0.15 else 3
        if n > 1 and x['cushionMonths'] is not None and x['cushionMonths'] < 1: n = 1
        if x['plate'] == 'full' and n > 0: n -= 1
        if x['felt'] == 'less' and n > 0: n -= 1
        if x['felt'] == 'more' and free > 0 and n < 3: n += 1
        ck('steps', o['slots'], n, 0)
    elif fn == 'qsFails':
        sp = x['spend']; months = x['cash'] / sp; rooms = [('paycheck', months / 3)]
        rate = (x['take'] - sp) / x['take']; rooms.append(('margin', 0 if rate <= 0 else rate / 0.1))
        if x['hiDebt'] > 0: rooms.append(('debt', 1 - min(1, x['hiDebt'] / (x['take'] * 12))))
        if x['incomes'] == 1 and 3 <= months < 6: rooms.append(('oneIncome', months / 6))
        if x['protDone'] < x['protMax']: rooms.append(('cover', (1 + x['protDone'] / x['protMax']) / 2))
        if x['lowGap'] > 0: rooms.append(('bumpy', x['cash'] / (x['lowGap'] * 3)))
        weak = sorted([r for r in rooms if r[1] < 1], key=lambda r: r[1])
        ck('how many weak spots', len(o['order']), len(weak), 0)
        for i, (k, room) in enumerate(weak):
            if i < len(o['rooms']): ck(f'room of spot {i + 1}', o['rooms'][i], room, 1e-9)
    elif fn == 'qsHidden':
        known = [i for i in x['items'] if i['year'] is not None and i['year'] > 0]
        tot = sum(i['year'] for i in known) if known else None
        ck('a year in all', o['total'], tot, 1e-9)
        day = x['spend'] * 12 / 365 if x['spend'] else None
        ck('days of spending', o['days'], None if tot is None or not day else tot / day, 1e-9)
    elif fn == 'qsRank':
        rows = [r for r in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'data', 'priors-2026.json')))['rows'] if r['field'] == 'netWorth']
        band = next((r for r in rows if r.get('ages') and (r['ages'][0] is None or x['age'] >= r['ages'][0]) and (r['ages'][1] is None or x['age'] <= r['ages'][1])), None)
        allr = next(r for r in rows if r['band'] == 'all ages')
        m = band['median']; nw = x['nw']
        ck('the middle', o['median'], m, 0)
        ck('where', o['where'] == ('below' if nw < m * 0.9 else 'above' if nw > m * 1.1 else 'near'), True)
        ck('quarter', o['quarter'], 1 if nw < allr['p25'] else 2 if nw < allr['median'] else 3 if nw < allr['p75'] else 4, 0)
    elif fn == 'qsDuel':
        P = x['pull'] in x['values']; T = x['test'] in x['values']
        want = (x['choice'] != 'no') if P and not T else (x['choice'] != 'yes') if T and not P else True
        ck('beaten', o['beaten'], want)


def invest_check(fn, x, o, ck):
    """Investing (M8I): the mix added up dollar by dollar, each fee as value x rate, the grid square month by month and
    year by year, and the Roth rule from its words (a dollar taxed now at the rate now or later at the rate later)."""
    if fn == 'ivMix':
        known, cls = 0.0, {}
        for a in x['accts']:
            p = a['parts']
            if not p or not a['amt'] or a['amt'] <= 0: continue
            s = sum(p.values())
            if s <= 0: continue
            known += a['amt']
            for k, v in p.items(): cls[k] = cls.get(k, 0.0) + a['amt'] * v / s
        total = sum(a['amt'] for a in x['accts'] if a['amt'] and a['amt'] > 0)
        lead = x['ret'] - x['age']
        guide = 0.9 if lead >= 25 else 0.5 + 0.4 * lead / 25 if lead >= 0 else max(0.3, 0.5 - 0.2 * min(1, -lead / 7))
        ck('the age guide', o['guide'], guide, 1e-12)
        ck('known', o['known'], known, 1e-6)
        if known > 0:
            stock = sum(cls.get(k, 0) for k in ('us', 'intl', 'stocks', 'single')) / known
            ck('stocks', o['stock'], stock, 1e-9)
            ck('inside the three', o['inside'], sum(cls.get(k, 0) for k in ('us', 'intl', 'stocks', 'bonds')) / known, 1e-9)
            aim = x['target'] if x['target'] is not None else guide
            ck('drift', o['drift'], stock - aim, 1e-9)
        comp, emp = {}, 0.0
        for a in x['accts']:
            for hd in a['holdings']:
                if hd['v'] <= 0: continue
                if hd['kind'] == 'employer': emp += hd['v']
                if hd['kind'] in ('employer', 'stock'): comp[hd['name'].lower()] = comp.get(hd['name'].lower(), 0) + hd['v']
        if total > 0:
            ck('employer share', o['employerShare'], emp / total, 1e-12)
            if comp: ck('the biggest company', o['biggest'], max(comp.values()) / total, 1e-12)
    elif fn == 'ivFees':
        year, missing, loads = 0.0, 0, []
        for a in x['accts']:
            for f in a['funds']:
                if f['er'] is None: missing += 1
                else: year += f['v'] * f['er']
                if f['load']: loads.append(1000 * f['load'])
            year += a['accountFee'] or 0
            if x['advisor']: year += a['amt'] * x['advisor']
        ck('fees a year', o['year'], year, 1e-6)
        ck('funds with no fee', o['missing'], missing, 0)
        for i, l in enumerate(loads): ck('a load on $1,000', o['loads'][i], l, 1e-9)
    elif fn == 'ivHeatCell':
        b = 1000.0
        for _ in range(60): b += b * x['apr'] / 12
        g = 1000.0
        for _ in range(5): g *= 1 + x['ret']
        ck('interest the debt no longer charges', o['debt'], b - 1000, 1e-6)
        ck('what investing grows', o['invest'], g - 1000, 1e-6)
        gap = (g - 1000) - (b - 1000)
        ck('the square', o['gap'], gap, 1e-6)
        ck('which side', o['side'] == ('even' if abs(gap) < 0.5 else 'invest' if gap > 0 else 'debt'), True)
    elif fn == 'ivRoth':
        choice = x['type'] in ('401(k)', 'Roth IRA', 'Traditional IRA')
        ck('a choice', o['ready'], choice)
        if choice:
            per = x['yearly'] if x['yearly'] else 1000
            now = sum(x['now'].values()); later = sum(x['later'].values())
            # traditional: the tax not paid now is invested, and the later rate is paid on it; Roth: the rate now is paid
            trad_keep = per * (1 - later); roth_keep = per * (1 - now)
            ck('traditional minus Roth, a year', o['yearGap'], trad_keep - roth_keep, 1e-6)


def peers_check(fn, x, o, ck):
    """Comparing with peers (M8N): each row looked up again in data/priors-2026.json and each rule applied from its words."""
    rows = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'data', 'priors-2026.json')))['rows']
    def where(v, m): return 'below' if v < m * 0.9 else 'above' if v > m * 1.1 else 'near'
    if fn == 'peNetWorth':
        nwr = [r for r in rows if r['field'] == 'netWorth']
        band = next((r for r in nwr if r.get('ages') and (r['ages'][0] is None or x['age'] >= r['ages'][0]) and (r['ages'][1] is None or x['age'] <= r['ages'][1])), None)
        allr = next(r for r in nwr if not r.get('ages'))
        m = band['median']; nw = x['nw']
        ck('the middle at the age', o['median'], m, 0)
        ck('where', o['where'] == where(nw, m), True)
        ck('quarter', o['quarter'], 1 if nw < allr['p25'] else 2 if nw < allr['median'] else 3 if nw < allr['p75'] else 4, 0)
        ck('over the 90th', o['top10'], nw >= allr['p90'])
        ck('of the middle', o['ratio'], nw / m, 1e-9)
    elif fn == 'peIncome':
        m = next(r for r in rows if r['field'] == 'income' and not r.get('ages') and not r.get('place') and not r.get('household'))['median']
        ck('the middle', o['middle'], m, 0)
        ck('where', o['where'] == where(x['gross'], m), True)
        ck('of the middle', o['ratio'], x['gross'] / m, 1e-9)
    elif fn == 'peSaving':
        c = next(r for r in rows if r['field'] == 'savingRate')['share']
        ck('the country', o['country'], c, 0)
        ck('the gap', o['gap'], x['rate'] - c, 1e-12)


def family_check(fn, x, o, ck):
    """Family money (M8F), worked out month by month instead of by stretches and formulas."""
    if fn == 'fmSandwich':
        parts = []
        for side in ('parents', 'kids'):
            a, yrs, frm = x[side] or 0, x[side + 'Years'], x[side + 'From'] or 0
            if a > 0:
                start = round(frm * 12)
                parts.append((a, start, None if not yrs else start + round(yrs * 12)))
        runs = lambda p, m: p[1] <= m and (p[2] is None or m < p[2])
        ck('a month at most', o['peak'], sum(p[0] for p in parts)); ck('this month', o['total'], sum(p[0] for p in parts if p[1] == 0))
        if len(parts) == 2:
            ends = [p[2] for p in parts]
            fin = [e for e in ends if e is not None]
            both = None if not fin else sum(1 for m in range(0, max(fin)) if runs(parts[0], m) and runs(parts[1], m))
            ck('both at once', o['both'], both, 0)
        ck('over the years', o['all'], None if any(p[2] is None for p in parts) else sum(p[0] * (p[2] - p[1]) for p in parts))
        ck('left for your goals', o['leftAfter'], x['takeHome'] - x['spending'] - (0 if x['inSpending'] else sum(p[0] for p in parts)))
        # the flows, summed at each month, give back what each part takes in that month
        for m in (0, 11, 12, 35, 59, 60, 119, 120, 180, 250):
            want = 0 if x['inSpending'] else -sum(p[0] for p in parts if runs(p, m))
            ck(f'flows at month {m}', sum(f[1] for f in o['flows'] if f[0] <= m), want, 1e-9)
    elif fn == 'fmBoomerang':
        save = max(0, x['rent'] - x['payHome']) * x['savePct']
        bal, m = x['have'], 0
        ck('saved a month', o['saving'], save, 1e-9); ck('by the end of the stay', o['byPlan'], x['have'] + save * x['months'], 1e-6)
        t = x['target']
        if t:
            reach = 0 if x['have'] >= t else None
            while reach is None and save > 0 and m < 100000:
                m += 1; bal += save
                if bal >= t - 1e-9: reach = m
            ck('months to the goal', o['reach'], reach, 0)
            ck('months after the plan', o['extra'], None if reach is None else max(0, reach - x['months']), 0)
            ck('a month to be there in time', o['perMonthFor'], max(0, t - x['have']) / x['months'], 1e-6)
        ck('the household side', o['household'], None if x['homeCost'] is None else x['homeCost'] - x['payHome'], 1e-9)
    elif fn == 'fmTuition':
        g = (1 + x['ret']) ** (1 / 12) - 1; n = round(x['startIn'] * 12)
        total = sum(x['yearly'] * x['kids'] * (1 + x['rise']) ** (x['startIn'] + y) for y in range(x['years']))
        ck('all the years', o['total'], total, max(0.01, total * 1e-12))
        grown = x['have']
        for _ in range(n): grown *= 1 + g
        need = max(0, total * x['share'] - grown)
        if n == 0:
            ck('put away a month', o['monthly'], None)
            covered = min(total, x['have'])
        else:
            # the level amount a month that grows to the need: by bisection on a month-by-month balance
            lo, hi = 0.0, need + 1
            for _ in range(200):
                mid = (lo + hi) / 2; b = 0.0
                for _ in range(n): b = b * (1 + g) + mid
                lo, hi = (mid, hi) if b < need else (lo, mid)
            ck('put away a month', o['monthly'], 0 if need == 0 else (lo + hi) / 2, 0.01)
            covered = min(total, max(total * x['share'], grown))
        ck('pay as it comes', o['payGo'], (total - covered) / (x['years'] * 12), 0.01)
        y = x['n529']; lim = y['rules']['joint'] if y['joint'] else y['rules']['single']; d = min(y['yearly'], lim)
        ck('NY 529 deducted', o['deducted'], d, 1e-9); ck('NY 529 saved', o['saved'], None if y['rate'] is None else d * y['rate'], 1e-9)


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
        cut = min(diff / left, x['perCheck']) if diff > 0 else 0  # a paycheck holds back at most what it withholds now
        ck('Step 4(b) deductions', o['deductions'], cut * x['checksYear'] / top if cut > 0 and top > 0 else 0, 0.05)
        ck('still a refund', o['stillRefund'], (diff - cut * left if cut > 0 and top > 0 else diff) if diff > 0 else 0, 0.05)
    elif fn == 'qcGlance':
        left = x['takeHome'] - x['spending'] - x['debtOutside']
        ck('left', o['left'], left); ck('kept', o['rate'], left / x['takeHome'], 1e-12)


def ratio_check(x, o, ck):
    """Ratios on Key numbers (Part 9), each worked out again from its definition: None when an input is missing or
    there is nothing to measure (a zero below the line), never a 0 in its place."""
    def has(*vs): return all(v is not None for v in vs)
    def div(a, b): return a / b if has(a, b) and b > 0 else None
    import re
    short = lambda k: re.search(r'card|later|payday|cash advance|medical|personal|famil|friend', k, re.I) is not None
    revol = lambda k: re.search(r'card|line of credit|heloc', k, re.I) is not None
    D = x['debts']
    ck('current ratio', o['current'], div(x['cash'], None if D is None else sum(d['balance'] for d in D if short(d['type']))))
    ck('healthcare reserve', o['health'], div(None if x['cash'] is None else x['cash'] + x['hsa'], x['oopMax']))
    ck('self-insurance threshold', o['selfins'], x['cash'] - x['target'] if has(x['cash'], x['target']) else None)
    ck('solvency', o['solvency'], div(x['netWorth'], x['assets']))
    ck('revolving vs installment', o['revolving'], None if D is None else div(sum(d['balance'] for d in D if revol(d['type'])), sum(d['balance'] for d in D)))
    if D is None: ck('credit mix', o['mix'], None)
    else:
        mort = any('mortgage' in d['type'].lower() for d in D); rv = any(revol(d['type']) and 'mortgage' not in d['type'].lower() for d in D)
        inst = any(not revol(d['type']) and 'mortgage' not in d['type'].lower() for d in D)
        ck('credit mix', o['mix'], mort + rv + inst, 0)
    if D is None or not D or any(d['apr'] is None or d['payment'] is None for d in D): ck('interest to principal', o['intprin'], None)
    else:
        i = sum(d['balance'] * d['apr'] / 12 for d in D); p = sum(d['payment'] for d in D) - i
        ck('interest to principal', o['intprin'], i / p if p > 0 else None, 1e-6)
    ck('home equity', o['equity'], x['homeValue'] - x['mortgage'] if has(x['homeValue'], x['mortgage']) else None)
    ck('loan to value', o['ltv'], div(x['mortgage'], x['homeValue']))
    ck('price to income', o['priceinc'], div(x['homeValue'], x['grossYear']))
    ck('real estate concentration', o['realestate'], div(x['homeValue'], x['assets']))
    ck('discretionary income', o['discretionary'], x['takeHome'] - x['fixed'] if has(x['takeHome'], x['fixed']) else None)
    ck('fixed vs variable', o['fixedvar'], div(x['fixed'], None if not has(x['fixed'], x['variable']) else x['fixed'] + x['variable']))
    by = {}
    for r in x['rows']:
        if r['kind'] == 'out': by[r['d'][:7]] = by.get(r['d'][:7], 0) + r['amt']
    vals = [by[k] for k in sorted(by)][-12:]
    if len(vals) < 3: ck('spending volatility', o['volatility'], None)
    else:
        mu = sum(vals) / len(vals); sd = (sum((v - mu) ** 2 for v in vals) / len(vals)) ** 0.5
        ck('spending volatility', o['volatility'], sd / mu, 1e-9)
    ck('side income share', o['side'], div(x['side'], x['total']) if has(x['side'], x['total']) else None)
    ck('total comp to base', o['totalcomp'], None if x['base'] is None or x['match'] is None or x['base'] <= 0 else (x['base'] + x['bonus'] + x['match']) / x['base'], 1e-9)
    ck('real wage growth', o['realwage'], (1 + x['growth']) / (1 + x['inflation']) - 1 if has(x['growth'], x['inflation']) else None, 1e-12)
    ck('income replacement', o['replace'], div(x['spendYear'], x['grossYear']))
    ck('Social Security replacement', o['ssreplace'], div(x['ssYear'], x['grossYear']))
    ck('investment to net worth', o['investnw'], div(x['invested'], x['netWorth']))
    ck('net worth to income', o['nwincome'], div(x['netWorth'], x['grossYear']))
    if not has(x['grossYear'], x['age'], x['financial']): ck('human capital', o['human'], None)
    else:
        n = max(0, x['retireAge'] - x['age']); r = x['realReturn']
        pv = sum(x['grossYear'] / (1 + r) ** k for k in range(1, n + 1))  # the same annuity, year by year
        ck('human capital', o['human'], pv / x['financial'] if x['financial'] > 0 else None, 1e-6)
    ck('tax efficiency', o['shelter'], div(x['advantaged'], x['invested']) if has(x['advantaged'], x['invested']) else None)
    if not has(x['invested'], x['spendYear'], x['age']): ck('longevity cover', o['longevity'], None)
    else:
        yrs = x['planAge'] - max(x['age'], x['retireAge'])
        ck('longevity cover', o['longevity'], x['invested'] / x['spendYear'] / yrs if x['spendYear'] > 0 and yrs > 0 else None, 1e-9)
    if x['wind'] is None: ck('windfall allocation', o['windfall'], None)
    else:
        yours = x['wind'] - x['toTax']
        ck('windfall allocation', o['windfall'], (x['toCash'] + x['toDebt'] + x['toInv']) / yours if yours > 0 else None, 1e-9)
    if x['rating'] is None: ck('confidence', o['confidence'], None)
    else:
        me = (x['rating'] - 1) / 9
        ck('confidence, your rating', o['confidence'][0], me, 1e-12)
        read = 'numbers' if x['of'] <= 0 else ('near' if abs(x['good'] / x['of'] - me) <= 0.2 + 1e-12 else ('ahead' if x['good'] / x['of'] > me else 'feeling'))
        ck('confidence, the read', o['confidence'][1] == read, True)


def play_bonus(b):
    # a bank bonus kept, worked month by month: the deposit's interest at each rate, the gap, its tax, the fees
    bonus, m = b.get('bonus'), b.get('months')
    dep = b.get('deposit') or 0
    if not (bonus and bonus > 0) or not (m and m > 0) or (dep > 0 and b.get('hysaRate') is None):
        return None
    def grow(rate):
        v = dep
        for _ in range(m):
            v += v * (rate or 0) / 12
        return v - dep
    lost = max(0.0, grow(b.get('hysaRate')) - grow(b.get('bankRate')))
    t = b.get('taxRate')
    tax = 0 if t is None else bonus * t
    kept_lost = lost if t is None else lost * (1 - t)
    return {'lost': lost, 'net': bonus - tax - kept_lost - (b.get('fees') or 0), 'tax': None if t is None else tax}


def play_check(fn, x, o, ck):
    if fn == 'plBonus':
        w = play_bonus(x)
        ck('ready', o['ready'], w is not None)
        if w is not None:
            ck('interest given up', o['lost'], w['lost'], 0.01); ck('kept', o['net'], w['net'], 0.02)
            if w['tax'] is not None: ck('tax', o['tax'], w['tax'], 0.01)
    elif fn == 'plHunt':
        banked = lined = 0.0; opn = need = 0
        for b in x['list']:
            st = b.get('state') if b.get('state') in ('planned', 'open', 'paid') else 'planned'
            w = play_bonus(b)
            if w is None: need += 1
            v = round(w['net'] * 100) / 100 if w else 0
            if st == 'paid': banked += v
            else: lined += v
            if st == 'open': opn += 1
        ck('kept', o['banked'], banked, 0.02); ck('lined up', o['lined'], lined, 0.02); ck('left', o['left'], max(0, 1000 - banked), 0.02)
        ck('open at once', o['open'], opn, 0); ck('missing a term', o['needs'], need, 0); ck('there', o['there'], banked >= 1000)
    elif fn == 'plChallenge':
        c, cash, sp, apr = x['cost'], x['cash'], x['spendMonth'], x['cardApr']
        ok = c is not None and c > 0 and cash is not None and cash >= 0 and sp is not None and sp > 0
        ck('ready', o['ready'], ok)
        if not ok: return
        def card(amt):
            if apr is None: return None
            bal, paid, r = amt, 0.0, apr / 12
            pmt = amt / 3 if r == 0 else amt * r / (1 - (1 + r) ** -3)
            for _ in range(3):
                bal = bal * (1 + r) - pmt; paid += pmt
            return paid - amt
        for k, fc, fk in (('cushion', c, 0), ('card', 0, c), ('half', c / 2, c / 2)):
            short = max(0, fc - cash); oncard = fk + short
            ck(k + ': cash left', o['ways'][k]['cashLeft'], max(0, cash - fc), 0.01)
            ck(k + ': on the card', o['ways'][k]['fromCard'], oncard, 0.01)
            ck(k + ': months after', o['ways'][k]['monthsAfter'], max(0, cash - fc) / sp, 0.006)
            want = card(oncard) if oncard > 0 else None
            got = o['ways'][k]['card']
            ck(k + ': interest', None if got is None else got['interest'], want, 0.02)
    elif fn == 'plFicoRound':
        share = {'pay': 0.35, 'owed': 0.30, 'length': 0.15, 'new': 0.10, 'mix': 0.10}
        want = sorted(share.values(), reverse=True)
        right = [share[k] == want[i] for i, k in enumerate(x['order'])]
        ck('places', o['places'], sum(right), 0); ck('weight placed right', o['points'], sum(share[k] for i, k in enumerate(x['order']) if right[i]), 0.001)
    elif fn == 'plNextMonthly':
        import datetime
        y, m, d = map(int, x['t'].split('-'))
        cur = datetime.date(y, m, d)
        while True:
            if cur.day == x['day'] and not (x['after'] and cur == datetime.date(y, m, d)): break
            cur += datetime.timedelta(days=1)
        ck('the date', o['d'] == cur.isoformat(), True)


# Households together, Same question (run Finish everything partly built, Part 12): each question's id, its number of
# options and whether they have an order ('scale') or not ('pick'), written out here a second time.
HH_Q = [('ask', 5, 'scale'), ('cushion', 4, 'scale'), ('split', 4, 'pick'), ('accounts', 3, 'scale'), ('stop', 5, 'scale'),
        ('debt', 3, 'scale'), ('family', 3, 'scale'), ('invest', 3, 'scale'), ('talk', 4, 'scale'), ('big', 5, 'scale')]


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
        elif fn == 'firePace':
            a = months_to(x['invested'], x['monthlyInvesting'], x['realReturn'], x['target'])
            b = months_to(x['invested'], x['monthlyInvesting'] + x['extra'], x['realReturn'], x['target'])
            ck('pace base', o['base'], a, 0); ck('pace date', o['pace'], b, 0)
            ck('pace sooner', o['sooner'], None if a is None or b is None else a - b, 0)
            if a is not None and b is not None: ck('more a month is never later', b <= a, True)
        elif fn == 'recapNumbers':
            B, N = x['before'], x['now']
            def m_of(ym): yy, mm = ym.split('-'); return int(yy) * 12 + int(mm) - 1
            keys = []
            for k in ('netWorth', 'surplus'):
                if N[k] is None: continue
                if B[k] is not None and abs(N[k] - B[k]) < 0.5: continue
                keys.append('num:' + k)
            if N['debtFreeMonths'] is not None:
                if B['debtFreeMonths'] is None: keys.append('date:debtFreeMonths')
                else:
                    gap = (m_of(x['beforeAt']) + B['debtFreeMonths']) - (m_of(x['at']) + N['debtFreeMonths'])
                    if gap != 0:
                        keys.append('date:debtFreeMonths')
                        t = [s for s in o['texts'] if s.startswith('Debt free') or s.startswith('Recalculating')]
                        ck('recap date words', bool(t) and (t[0].startswith('Recalculating') if gap < 0 else f'{gap} month' in t[0]), True)
            ck('recap keys', o['keys'] == keys, True)
            for k in ('netWorth', 'surplus'):
                if N[k] is not None and B[k] is not None and ('num:' + k) in keys:
                    d = N[k] - B[k]; t = [s for s in o['texts'] if s.startswith('Net worth' if k == 'netWorth' else 'Monthly surplus')][0]
                    ck('recap up or down', ('up ' if d > 0 else 'down ') in t, True)
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
        elif fn.startswith('op') and fn in ('opTransition', 'opPapers', 'opTwoSides', 'opPackage', 'opSearchFund', 'opFamily', 'opAgeCare'):
            own_check(fn, x, o, ck, law.ref)
        elif fn in ('plBonus', 'plHunt', 'plChallenge', 'plFicoRound', 'plNextMonthly'):
            play_check(fn, x, o, ck)
        elif fn == 'ratios':
            ratio_check(x, o, ck)
        elif fn in ('hmRoommateExit', 'hmUntangle'):
            hard_check(fn, x, o, ck)
        elif fn in ('esHeirs', 'esTenYear', 'esCompare'):
            estate_check(fn, x, o, ck, law)
        elif fn in ('gigRate', 'gigSetAside', 'gigRetire', 'gigInvoices', 'gigApps', 'gigSafeHarbor', 'gigPayouts', 'gigVsFloor'):
            gig_check(fn, x, o, ck, law)
        elif fn in ('fmSandwich', 'fmBoomerang', 'fmTuition'):
            family_check(fn, x, o, ck)
        elif fn in ('qsStats', 'qsCapacity', 'qsFails', 'qsHidden', 'qsRank', 'qsDuel'):
            quest_check(fn, x, o, ck)
        elif fn in ('peNetWorth', 'peIncome', 'peSaving'):
            peers_check(fn, x, o, ck)
        elif fn in ('ivMix', 'ivFees', 'ivHeatCell', 'ivRoth'):
            invest_check(fn, x, o, ck)
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
        elif fn == 'fwSwan':
            # months of spending plus the worry; the gap and the months of cash past the worry
            n = round(x['monthly'] * x['months'] + x['worry']); ck('number', o['number'], n, 0)
            if x['cash'] is not None:
                ck('gap', o['gap'], max(0, n - x['cash'])); ck('months', o['monthsHave'], max(0, x['cash'] - x['worry']) / x['monthly'], 1e-6)
        elif fn == 'fwPeak':
            # year by year: the first age the level payment to the last age (at the start of each year) covers the spending
            b, found = x['worth'], None
            for a in range(x['age'], x['endAge']):
                if b > 0 and spend_down(max(0, b), x['leave'], x['endAge'] - a, x['growth']) >= x['spendYear']:
                    found = (a, b); break
                b = b * (1 + x['growth']) + x['saveYear']
            ck('peak age', o['peakAge'], None if found is None else found[0], 0); ck('peak', o['peak'], None if found is None else found[1])
        elif fn == 'fwZeroTax':
            # taxable income = ordinary + gains - deduction stays inside the 0% band; a sale's cash = gains / its gain share
            ordi = x['ordinary']; room = x['gainTop'] + x['std'] - ordi if ordi <= x['std'] else max(0, x['gainTop'] - (ordi - x['std']))
            ck('gain room', o['gainRoom'], room); ck('sale cash', o['saleCash'], room / x['gainShare']); reach = min(ordi, x['std']) + room / x['gainShare']
            ck('reach', o['reach'], reach); ck('fits', o['fits'], x['spend'] <= reach + 0.5)
        elif fn == 'fwBaby':
            g = lambda k: x[k]
            d = [None if g('cash') is None else g('cash') >= 1000, None if g('debt') is None else g('debt') <= 0,
                 None if g('cash') is None or g('monthly') is None else g('cash') >= g('monthly') * 3, None if g('retireShare') is None else g('retireShare') >= 0.1495,
                 True if not x['kids'] else x['college'], None if g('mortgage') is None else g('mortgage') <= 0]
            for i in range(6): ck(f'step {i + 1}', o['done'][i], d[i])
            first = next((i for i in range(6) if d[i] is not True), None)
            ck('here', o['here'], 6 if first is None else (None if d[first] is None else first))
        elif fn == 'fwStage':
            w = x['worth']; i = 0 if w < 25000 else 1 if w < 100000 else 2; to = [25000, 100000, None][i]
            left = None if to is None else max(0, to - w); ck('stage', o['i'], i, 0); ck('left', o['left'], left)
            ck('months', o['months'], math.ceil(left / x['monthly']) if left is not None and x['monthly'] else None, 0)
        elif fn == 'fwLifetime':
            sp = x['spans']; ck('total', o['total'], sum(q['years'] * q['pay'] for q in sp))
            ck('hours', o['hours'], sum(q['years'] * q['hours'] * 52 for q in sp) if all(q['hours'] for q in sp) else None)
        elif fn == 'fwStep9':
            cu = x['monthly'] * 6; ck('income', o['income'], x['invested'] * x['rate'] / 12); ck('cushion left', o['cushionLeft'], max(0, cu - x['cash'])); ck('cache', o['cache'], max(0, x['cash'] - cu))
        elif fn == 'fwWins':
            m = sum(w['save'] for w in x['wins'].values() if w['save'] is not None); ck('month', o['month'], m); ck('fi days', o['fiDays'], m * 12 / (x['yearSpend'] / 365), 1e-6)
        elif fn == 'fwLead':
            w = x['worth']; ck('lead', o['lead'] == ('debtfree' if (w is not None and w < 0) else ('fi' if x['fire'] else 'next')), True)
        elif fn == 'fwDtiMonths':
            g = x['gross']
            if g is None: ck('no pay, no months', o['months'] is None, True)
            else:
                # month by month from 0: the first month where home plus the payments of the debts still open fit the target
                want = None
                for m in range(0, 121):
                    if (x['home'] + sum(d['pay'] for d in x['debts'] if d['off'] is None or d['off'] > m)) / g <= x['target']: want = m; break
                ck('months', o['months'] is None if want is None else o['months'], True if want is None else want, 0)
        elif fn == 'fwMonthEnd':
            ds = x['days']; t = x['today']; L = x['last']
            asis = x['worth'] + sum(d['net'] for d in ds if t < d['day'] <= L)
            ck('end as is', o['endAsIs'], asis, 1e-6); ck('end planned', o['endPlanned'], asis + (x['extra'] if L > t else 0), 1e-6); ck('days', o['n'], L - t + 1, 0)
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
        elif fn == 'enJoy':
            # by lines that have a joy tap: the weights first, then each line
            L = [l for l in x['lines'] if l['amt'] > 0]
            JR = [l for l in L if l['joy'] is not None]
            w = x['wage'] if x['wage'] is not None and x['wage'] > 0 else None
            if not JR: ck('not ready', o['ready'], False)
            else:
                tot = sum(l['amt'] for l in L); rt = sum(l['amt'] for l in JR); pts = sum(l['joy'] for l in JR)
                ck('total', o['total'], tot, 0.02); ck('rated total', o['ratedTotal'], rt, 0.02)
                ck('a dollar\'s joy', o['dollarJoy'], sum(l['joy'] * l['amt'] for l in JR) / rt, 1e-9)
                ck('share on what is loved', o['lovedShare'], sum(l['amt'] for l in JR if l['joy'] >= 4) / rt, 1e-9)
                by = {l['name']: l for l in L}
                for r in o['rows']:
                    l = by[r['name']]; hrs = l['amt'] / w if w else None
                    ck('hours of work', r['hours'], hrs, 1e-9)
                    if l['joy'] is None: ck('no tap, no joy share', r['joyShare'], None); continue
                    ck('share of joy', r['joyShare'], l['joy'] / pts, 1e-12); ck('joy per $100', r['per100'], l['joy'] * 100 / l['amt'], 1e-9)
                    ck('joy per hour', r['perHour'], l['joy'] / hrs if hrs else None, 1e-9)
        elif fn == 'enCurve':
            C = [c for c in x['cats'] if c['amt'] > 0]
            P = [c for c in C if x['place'].get(c['cat']) in ('survival', 'comforts', 'luxuries', 'past')]
            if not P: ck('not ready', o['ready'], False)
            else:
                tot = sum(c['amt'] for c in C); pt = sum(c['amt'] for c in P)
                lv = [sum(c['amt'] for c in P if x['place'][c['cat']] == s_) for s_ in ('survival', 'comforts', 'luxuries', 'past')]
                for k in range(4): ck('a step of the curve', o['levels'][k], lv[k], 0.02)
                ck('placed', o['placedTotal'], pt, 0.02); ck('past enough', o['past'], lv[3], 0.02)
                ck('the Enough meter', o['meter'], (pt - lv[3]) / pt, 1e-6)
                ck('the curve\'s enough', o['share'], math.floor((1 - lv[3] / tot) * 100 + 0.5) / 100, 0.0051)
        elif fn == 'enRich':
            I = [i for i in x['items'] if i['name'] or i['price'] is not None]
            yrs = max(0, x['lifeTo'] - x['age']) if x['age'] is not None and x['lifeTo'] is not None else None
            days = lambda p: math.floor(p / x['perDay'] + 0.5)
            by = {i['id']: i for i in I}
            for r in o['items']:
                i = by[r['id']]; p = i['price']; j = i['joy']
                ck('joy per $100 of a price', r['per100'], j * 100 / p if j is not None and p else None, 1e-9)
                my = yrs if i['kind'] == 'experience' else None
                ck('memory years', r['memYears'], my); ck('dividend', r['dividend'], j * my if my is not None and j is not None else None, 1e-9)
                ck('ten years later', r['laterYears'], max(0, my - 10) if my is not None else None)
                ck('days on the FI date', r['days'], days(p) if not i['done'] and p else None)
            ck('to do', o['plannedTotal'], sum(i['price'] or 0 for i in I if not i['done']), 0.02)
            ck('done', o['doneTotal'], sum(i['price'] or 0 for i in I if i['done']), 0.02)
            al = [i for i in I if not i['done'] and i['regret'] == 'alot']; at = sum(i['price'] or 0 for i in al)
            ck('would regret a lot', o['alotTotal'], at, 0.02); ck('its days', o['alotDays'], days(at) if al and at > 0 else None)
            rk = {'alot': 0, 'little': 1, 'no': 2}
            order = sorted(I, key=lambda i: (rk.get(i['regret'], 3), -(i['joy'] or 0), i['price'] or 0, i['name']))
            ck('the regret view', o['regret'] == [i['id'] for i in order], True)
        elif fn == 'enSubs':
            S = [s_ for s_ in x['subs'] if s_['amt'] > 0]
            if not S or x['totalDays'] is None: ck('not ready', o['ready'], False)
            else:
                tot = sum(s_['amt'] for s_ in S); w = x['wage'] if x['wage'] is not None and x['wage'] > 0 else None
                ck('total', o['total'], tot, 0.02); ck('days, all of them', o['days'], math.floor(x['totalDays'] + 0.5))
                by = {s_['name']: s_ for s_ in S}
                for r in o['rows']:
                    a = by[r['name']]['amt']
                    ck('a subscription\'s days', r['days'], math.floor(x['totalDays'] * a / tot + 0.5))
                    ck('hours of work a year', r['hoursYear'], a * 12 / w if w else None, 1e-9)
        elif fn == 'bpHsa':
            B = ref['benefits']; nb = lambda v: v is None
            if nb(x['cover']) or nb(x['you']) or nb(x['rate']): ck('not ready', o['ready'], False)
            else:
                lim = B['hsa'][x['cover']] + (B['hsa']['catchUp55'] if x['age'] is not None and x['age'] >= 55 else 0)
                emp = max(0, x['employer'] or 0); put = min(max(0, x['you']), max(0, lim - emp))
                ck('HSA that counts', o['put'], put, 0.01); ck('HSA a year', o['yearly'], put * x['rate'] + emp, 0.01)
                y, g = x['years'], x['growth']
                fv = None if y is None or g is None else 0 if y <= 0 else sum((put + emp) * (1 + g) ** k for k in range(y))
                ck('HSA invested', o['grows'], fv, 0.01); ck('receipts', o['receiptsBank'], None if y is None else (x['receipts'] or 0) * max(0, y), 0.01)
        elif fn == 'bpDcfsa':
            D = ref['benefits']['dcfsa']; ages = [a for a in x['ages'] if a is not None and a >= 0]
            if x['care'] is None or x['rate'] is None or not ages: ck('not ready', o['ready'], False)
            else:
                young = [a for a in ages if a < D['ageUnder']]; cap = D['separate'] if x['separate'] else D['limit']
                put = min(x['care'], cap) if young else 0; yrs = max(D['ageUnder'] - a for a in young) if young else 0
                ck('care that counts', o['put'], put, 0.01); ck('FSA a year', o['yearly'], put * x['rate'], 0.01); ck('daycare years', o['years'], yrs); ck('FSA in all', o['total'], put * x['rate'] * yrs, 0.01)
        elif fn == 'bpEspp':
            E = ref['benefits']['espp']
            if x['put'] is None or x['discount'] is None or x['rate'] is None or not (0 < x['discount'] <= E['maxDiscount'] + 1e-9): ck('not ready', o['ready'], False)
            else:
                d = x['discount']; put = min(x['put'], E['cap'] * (1 - d)); gain = put * d / (1 - d)
                ck('ESPP put in', o['put'], put, 0.01); ck('ESPP gain', o['gain'], gain, 0.01); ck('ESPP after tax', o['yearly'], gain * (1 - x['rate']), 0.01)
        elif fn == 'bpCommuter':
            if x['monthly'] is None or x['rate'] is None: ck('not ready', o['ready'], False)
            else:
                cov = min(x['monthly'], ref['benefits']['commuterMonthly']) * 12
                ck('commuter covered', o['covered'], cov, 0.01); ck('commuter a year', o['yearly'], cov * x['rate'], 0.01)
        elif fn == 'bpCoverage':
            h, magi, C = x['h'], x['magi'], ref['cliff']; P = ref['studentLoans']['poverty']
            f = P['base'] + P['perPerson'] * max(0, h['size'] - 1); r = magi / f
            bench = C['aca']['benchmark40'].get(h['state'], C['aca']['benchmarkUs']) * 12 * h['adults']
            if h['state'] not in C['medicaid']['nonExpansion'] and r <= C['medicaid']['adultMultiple'] + 1e-9: want = ('medicaid', 0, bench)
            elif h['state'] == 'NY' and r <= C['ny']['essentialMultiple'] + 1e-9: want = ('essential', C['ny']['essentialPremium'] * 12 * h['adults'], bench)
            elif r < C['aca']['floorMultiple']: want = ('gap', bench, 0)
            elif r > C['aca']['cliffMultiple'] + 1e-9: want = ('full', bench, 0)
            else:
                lo, pct = 0.0, None
                for up, a, b in C['aca']['applicable']:
                    if r < up or up == C['aca']['cliffMultiple']: pct = a + (b - a) * min(1, max(0, (r - lo) / (up - lo))); break
                    lo = up
                cost = min(bench, pct * magi); want = ('aca', cost, bench - cost)
            ck('coverage', o['on'] == want[0], True); ck('coverage cost', o['cost'], want[1], 0.01); ck('the credit', o['help'], want[2], 0.01)
        elif fn == 'bpPlans':
            rows = []
            for i, p in enumerate(x['plans'][:3]):
                if p['premium'] is None or p['deductible'] is None or p['oop'] is None: rows.append(None); ck('plan not ready', o['rows'][i]['ready'], False); continue
                full = p['premium'] * 12; cr = min(full, x['help']) if p['market'] and x['help'] and x['help'] > 0 else 0; yr = full - cr
                oop = max(p['oop'], p['deductible']); rows.append((i, yr, yr + p['deductible'], yr + oop))
                ck('plan a year', o['rows'][i]['year'], yr, 0.01); ck('typical year', o['rows'][i]['typical'], yr + p['deductible'], 0.01); ck('heavy year', o['rows'][i]['heavy'], yr + oop, 0.01)
            okr = [r for r in rows if r]
            for k, j in (('light', 1), ('typical', 2), ('heavy', 3)):
                want = None
                if len(okr) >= 2:
                    best = okr[0]
                    for r in okr[1:]:
                        if r[j] < best[j] - 1e-9: best = r
                    want = best[0]
                ck('least ' + k, o['cheapest'][k], want)
        elif fn == 'hhCompare':
            # Households together, Same question: from the definition (the questions' order and kinds read from the source list)
            QS = HH_Q
            ppl = [p for p in x['people'] if str(p['n']).strip()]
            want, talk = [], []
            for order, (qid, nopt, kind) in enumerate(QS):
                ix = [p['a'][qid] for p in ppl if isinstance(p['a'].get(qid), int) and 0 <= p['a'][qid] < nopt]
                if len(ix) < 2: want.append((qid, 'open', None)); continue
                sp = max(ix) - min(ix)
                st = 'same' if sp == 0 else ('apart' if kind == 'pick' or sp > 1 else 'near')
                spv = (0 if sp == 0 else nopt) if kind == 'pick' else sp
                want.append((qid, st, spv))
                if st in ('near', 'apart'): talk.append((-spv, order, qid))
            for r, w in zip(o['rows'], want):
                ck('the state of a question', r['state'] == w[1], True); ck('its spread', r['spread'], w[2], 0)
            ck('the talk points in order', o['talk'] == [t[2] for t in sorted(talk)], True)
            ck('ready', o['ready'], len(ppl) >= 2 and any(w[1] != 'open' for w in want))
        elif fn == 'hhFiTogether':
            def ym(sv):
                y, m = sv.split('-'); return int(y) * 12 + int(m)
            P = x['people']; nums = [p['fi'] for p in P if p['fi'] is not None and p['fi'] > 0]; ds = [ym(p['date']) for p in P if p['date']]
            ck('the gap in the number', o['numGap'], max(nums) - min(nums) if len(nums) >= 2 else None)
            ck('the gap in time', o['dateGap'], max(ds) - min(ds) if len(ds) >= 2 else None, 0)
            ck('months from now', o['months'] == [ym(p['date']) - ym(x['now']) if p['date'] else None for p in P], True)
            ck('who is missing', o['missing'] == [p['n'] for p in P if p['fi'] is None or p['date'] is None], True)
        elif fn == 'hhEquity':
            nz = lambda v_: v_ if v_ is not None and v_ >= 0 else None
            paid = [(nz(p['put']) or 0) + (nz(p['monthly']) or 0) * (nz(p['months']) or 0) for p in x['people']]
            tot = sum(paid); eq = x['value'] - x['owed'] if x['value'] is not None and x['owed'] is not None else None
            ck('equity', o['equity'], eq); ck('everyone, put in', o['total'], tot)
            ck('ready', o['ready'], eq is not None and tot > 0 and len(paid) >= 2)
            for r, pd in zip(o['rows'], paid):
                ck('put in, all of it', r['paid'], pd)
                sh = pd / tot if tot > 0 else None
                ck('share', r['share'], sh, 1e-9)
                ck('part by contributions', r['byPaid'], eq * sh if eq is not None and sh is not None else None)
                ck('part split equally', r['equal'], eq / len(paid) if eq is not None else None)
        elif fn == 'hhMarryGap':
            P = x['people']
            if len(P) < 2 or any(p['gross'] is None for p in P): ck('not ready', o['ready'], False)
            else:
                one = [law.federal(p['gross'], 0, 'Single')[0] for p in P]; alls = sum(one)
                ck('everyone single', o['allSingle'], alls)
                pairs = []
                for i in range(len(P)):
                    for j in range(i + 1, len(P)):
                        mar = law.federal(P[i]['gross'] + P[j]['gross'], 0, 'Married jointly')[0] + alls - one[i] - one[j]
                        pairs.append((mar - alls, i, j, mar))
                by = {(w[1], w[2]): w for w in pairs}
                ck('every pair once', sorted((r['i'], r['j']) for r in o['pairs']) == sorted(by), True)
                ck('the lowest tax first', all(o['pairs'][k]['gap'] <= o['pairs'][k + 1]['gap'] + 1e-6 for k in range(len(o['pairs']) - 1)), True)
                for r in o['pairs']:
                    w = by[(r['i'], r['j'])]; ck('married', r['married'], w[3]); ck('the gap', r['gap'], w[0])
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
        elif fn == 'slRefi':
            # the annuity formula, and the total as payment x months (a level payment clears the loan in its last month)
            r, n, B = x['rate'] / 12, x['years'] * 12, x['balance']
            pay = B * r / (1 - (1 + r) ** -n)
            ck('payment', o['payment'], pay, 0.01); ck('paid', o['paid'], pay * n, 0.05); ck('months', o['months'], n, 0)
            ck('against the federal plan', o['diff'], pay * n - (x['fed'] + x['tax']), 0.05)
        elif fn == 'slLadder':
            L = ref['studentLoans']; table = dict((y, v) for y, v in L['rates'])
            def rate_of(g):
                if g['rate'] is not None: return g['rate']
                if g['year'] not in table: return None
                return round(table[g['year']] + (L['gradAdd'] if g['level'] == 'grad' else L['plusAdd'] if g['level'] == 'plus' else 0), 6)
            if any(rate_of(g) is None for g in x['rungs']):
                ck('needs a rate', o.get('needs', 0) > 0, True)
            else:
                gap = L['grace'] if x['gap'] is None else x['gap']
                last = max(int(g['year'][:4]) for g in x['rungs'])
                tot_before = tot_pay = tot_paid = 0.0
                for g in x['rungs']:
                    rt, y = rate_of(g), int(g['year'][:4])
                    months = max(0, (last + 1 - y) * 12 + (5 - 9) + gap)  # September of its year to May after the last year, plus the gap
                    before = 0 if (g['subsidized'] and g['level'] == 'ug') else g['amount'] * rt * months / 12
                    i = rt / 12; n = L['standardYears'] * 12
                    X = (g['amount'] + before) * i / (1 - (1 + i) ** -n) if i > 0 else (g['amount'] + before) / n
                    # the waiting interest goes first and earns nothing; once it is gone the rest is a plain annuity
                    P, A, k, paid = g['amount'], before, 0, 0.0
                    while A > 0.005 and k < n:
                        k += 1; it = P * i; p_ = min(X, P + A + it); paid += p_
                        A += it; t = min(p_, A); A -= t; P = max(0, P - (p_ - t))
                    if P > 0.005 and k < n:
                        m = -math.log(1 - P * i / X) / math.log(1 + i) if i > 0 else P / X
                        full = min(n - k, int(math.floor(m + 1e-9)))
                        Bf = P * (1 + i) ** full - X * ((1 + i) ** full - 1) / i if i > 0 else P - X * full
                        paid += X * full + (min(max(0, Bf * (1 + i)), X) if full < n - k and Bf > 0.005 else 0)
                    tot_before += before; tot_pay += X; tot_paid += paid
                principal = sum(g['amount'] for g in x['rungs'])
                ck('interest before payments', o['before'], tot_before, 0.01); ck('owed', o['owed'], principal + tot_before, 0.01)
                ck('payment', o['payment'], tot_pay, 0.01); ck('paid', o['paid'], tot_paid, 0.05)
                ck('blended rate', o['blended'], sum(g['amount'] * rate_of(g) for g in x['rungs']) / principal, 1e-9)
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
