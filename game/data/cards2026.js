/* ============================================================================
   SLAM the Game: data/cards2026.js
   PURPOSE     Data only. The card library of the card vault (features/vault.js): 93 cards at 12 US
               banks. Each card is one full record of the template (data/cardtemplate.js): the yearly
               fee, the welcome offer, the spending it needs, the months, the credit it usually needs,
               the network, the switches (has) with their details, the earn rates by category, the
               yearly credits, "What is unique", and its source with the date a person looked at it.
               Also: a floor value for each kind of point, the 5/24 rule of Chase, the score bands.
               No logic.
   INPUT       Nothing.
   OUTPUT      window.CARDS2026.
   SOURCE      The offers layer of the Slam web app (data/library/card-offers.json, version 2.0.0,
               as of 2026-11-15): review sites read on 2026-11-14 (Chase) and 2026-11-15 (the other
               banks). No offer was confirmed on an application page. The rewards layer of the Slam
               web app (data/library/cards.json, version 1.0.0, as of 2026-11-06): the pages of the
               banks first, for 67 of the cards. The other 26 cards have the offer only. The 5/24
               rule is reported by cardholders and review sites. Chase does not publish it (read
               2026-11-14). The point values are floor assumptions of SLAM.
   RULES       This file is generated. Do not edit it. Run: node tools/game_cards_build.mjs, then
               npx prettier --write game/data/cards2026.js. Offers change each month. The screen shows
               the date of this file, and tells the player to look at the page of the bank before they
               apply. amt null: the sources do not agree, and no dollar value is counted. A card that
               the admin adds (the table card_library) takes the place of a card here with the same id.
   ========================================================================= */
window.CARDS2026 = {
 "asOf": "2026-11-15",
 "source": "Review sites read on 2026-11-14 (Chase) and 2026-11-15 (the other banks); each offer lists its own. Chase's own Freedom page and Capital One's own sign-up bonus page are the only issuer pages among them. No offer was confirmed on an application page.",
 "cardsAsOf": "2026-11-06",
 "cardsSource": "The issuers' own pages first (Chase, Capital One, Bank of America, Wells Fargo, US Bank, Citi through Mastercard's Citi page, American Express, Apple), read on 2026-11-06; a review site where the issuer page would not load (verified: secondary); the rest from what was known in mid 2026 (verified: unverified, with what to check). Written by tools/library/cards-source.mjs.",
 "note": "Welcome offers change each month. Each offer here came from a review site, not from an application page. Look at the offer on the bank's own page before you apply.",
 "rule": {
  "issuer": "Chase",
  "slots": 5,
  "months": 24,
  "words": "Chase usually declines anyone who opened 5 or more cards, at any bank, in the last 24 months",
  "businessCardsCount": false,
  "source": "Widely reported by cardholders and review sites; Chase does not publish it",
  "date": "2026-11-14"
 },
 "scoreBands": {
  "good": 670,
  "excellent": 740,
  "source": "The bands review sites use for these cards (good from 670, excellent from 740); issuers do not publish a cut-off"
 },
 "units": {
  "cash": {
   "n": "dollars",
   "v": 1,
   "cash": true
  },
  "ur": {
   "n": "Chase Ultimate Rewards points",
   "v": 0.01,
   "cash": true
  },
  "united": {
   "n": "United miles",
   "v": 0.01,
   "cash": false
  },
  "southwest": {
   "n": "Southwest points",
   "v": 0.012,
   "cash": false
  },
  "marriott": {
   "n": "Marriott Bonvoy points",
   "v": 0.006,
   "cash": false
  },
  "ihg": {
   "n": "IHG points",
   "v": 0.005,
   "cash": false
  },
  "hyatt": {
   "n": "World of Hyatt points",
   "v": 0.015,
   "cash": false
  },
  "aeroplan": {
   "n": "Aeroplan points",
   "v": 0.01,
   "cash": false
  },
  "avios": {
   "n": "Avios",
   "v": 0.01,
   "cash": false
  },
  "disney": {
   "n": "Disney gift card dollars",
   "v": 1,
   "cash": false
  },
  "mr": {
   "n": "Amex Membership Rewards points",
   "v": 0.006,
   "cash": true
  },
  "c1": {
   "n": "Capital One miles",
   "v": 0.01,
   "cash": true
  },
  "ty": {
   "n": "Citi ThankYou points",
   "v": 0.01,
   "cash": true
  },
  "wf": {
   "n": "Wells Fargo Rewards points",
   "v": 0.01,
   "cash": true
  },
  "bofa": {
   "n": "Bank of America points",
   "v": 0.01,
   "cash": true
  },
  "delta": {
   "n": "Delta SkyMiles",
   "v": 0.01,
   "cash": false
  },
  "aa": {
   "n": "American AAdvantage miles",
   "v": 0.01,
   "cash": false
  },
  "hilton": {
   "n": "Hilton Honors points",
   "v": 0.004,
   "cash": false
  }
 },
 "offers": [
  {
   "id": "chase-sapphire-preferred",
   "bank": "Chase",
   "n": "Sapphire Preferred",
   "network": "Visa",
   "fee": 95,
   "amt": 75000,
   "unit": "ur",
   "spend": 5000,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "travelPortal",
      "x": 5
     },
     {
      "cat": "dining",
      "x": 3
     },
     {
      "cat": "gas",
      "x": 3
     },
     {
      "cat": "streaming",
      "x": 3
     },
     {
      "cat": "travel",
      "x": 2
     }
    ],
    "picks": [],
    "words": "5x Chase Travel, 3x dining, gas and EV charging, online groceries, top streaming, 2x other travel, 1x everything else"
   },
   "credits": [
    {
     "name": "Chase Travel hotel credit",
     "value": 100,
     "words": "Up to $100 a card year on hotels booked through Chase Travel"
    },
    {
     "name": "Global Entry or TSA PreCheck",
     "value": 30,
     "words": "Up to $120 every 4 years ($30 a year spread)"
    },
    {
     "name": "DashPass membership",
     "value": 0,
     "words": "A free year of DashPass (activate by Dec 31, 2029); not counted in dollars"
    }
   ],
   "source": "The card: https://www.chase.com/travel/guide/tips/preferred-update (issuer). The offer: onemileatatime.com Sapphire comparison; upgradedpoints.com/credit-cards/chase (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "transfer": true,
    "rental": true,
    "tripCancel": true,
    "tripDelay": true,
    "baggage": true,
    "purchase": true,
    "warranty": true,
    "noForeignFee": true,
    "trusted": true
   },
   "hasWords": {
    "transfer": "Holding this card lets Chase points move to airlines and hotels",
    "rental": "Primary rental car coverage: theft and collision up to $60,000 (decline the counter coverage)",
    "tripCancel": "Trip cancellation and interruption, up to $10,000 a person",
    "tripDelay": "Trip delay over 12 hours or overnight, up to $500 a person",
    "baggage": "Lost and delayed baggage",
    "purchase": "Purchase protection: 120 days, up to $500 an item",
    "warranty": "Extended warranty: one more year on US warranties of 3 years or less",
    "trusted": "Up to $120 every 4 years ($30 a year spread)"
   },
   "unique": [
    {
     "label": "What it earns",
     "words": "Points"
    },
    {
     "label": "About the points",
     "words": "Points are worth 1 cent each on Chase Travel; transfer partners can be worth more. Groceries earn 3x online only (not Target, Walmart or clubs)"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "19.49% to 27.74% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Note",
     "words": "Refreshed June 2026: 3x gas, vacation rentals and the hotel credit are new"
    }
   ]
  },
  {
   "id": "chase-sapphire-reserve",
   "bank": "Chase",
   "n": "Sapphire Reserve",
   "network": "Visa",
   "fee": 795,
   "amt": 100000,
   "unit": "ur",
   "spend": 6000,
   "months": 3,
   "min": "excellent",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "travelPortal",
      "x": 8
     },
     {
      "cat": "airline",
      "x": 4
     },
     {
      "cat": "hotel",
      "x": 4
     },
     {
      "cat": "dining",
      "x": 3
     }
    ],
    "picks": [],
    "words": "8x Chase Travel, 4x flights and hotels booked direct, 3x dining, 1x everything else"
   },
   "credits": [
    {
     "name": "Travel credit",
     "value": 300,
     "words": "Up to $300 a card year on any travel"
    },
    {
     "name": "The Edit hotel credit",
     "value": 500,
     "words": "Up to $500 a year ($250 a booking) on prepaid 2-night stays through The Edit"
    },
    {
     "name": "Sapphire Exclusive Tables dining",
     "value": 300,
     "words": "$150 Jan to Jun and $150 Jul to Dec at select OpenTable restaurants"
    },
    {
     "name": "StubHub and viagogo",
     "value": 300,
     "words": "$150 each half year, activation needed, through Dec 31, 2027"
    },
    {
     "name": "DoorDash promos",
     "value": 300,
     "words": "$15 off one restaurant order and two $10 grocery or retail promos a month (about $300 a year if used every month)"
    },
    {
     "name": "Peloton membership",
     "value": 120,
     "words": "$10 a month, activation needed, through Dec 31, 2027"
    },
    {
     "name": "Lyft",
     "value": 120,
     "words": "$10 a month in the Lyft app, through Sep 30, 2027"
    },
    {
     "name": "Apple TV and Apple Music",
     "value": 0,
     "words": "Free subscriptions (activate by Jun 22, 2027); counted only if the client would pay for them"
    },
    {
     "name": "Global Entry or TSA PreCheck",
     "value": 30,
     "words": "Up to $120 every 4 years ($30 a year spread)"
    }
   ],
   "source": "The card: https://creditcards.chase.com/rewards-credit-cards/sapphire/reserve (issuer). The offer: onemileatatime.com Sapphire comparison; upgradedpoints.com/credit-cards/chase (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "transfer": true,
    "rental": true,
    "tripCancel": true,
    "tripDelay": true,
    "baggage": true,
    "purchase": true,
    "warranty": true,
    "lounge": true,
    "noForeignFee": true,
    "trusted": true
   },
   "hasWords": {
    "transfer": "Holding this card lets Chase points move to airlines and hotels",
    "rental": "Primary rental car coverage up to $75,000",
    "tripCancel": "Trip cancellation and interruption, up to $10,000 a person",
    "tripDelay": "Trip delay over 12 hours or overnight, up to $500 a ticket",
    "baggage": "Lost and delayed baggage",
    "purchase": "Purchase protection: 120 days, up to $10,000 an item",
    "warranty": "Extended warranty: one more year on US warranties of 3 years or less",
    "lounge": "Priority Pass and Chase Sapphire Lounges, with up to two guests",
    "trusted": "Up to $120 every 4 years ($30 a year spread)"
   },
   "unique": [
    {
     "label": "What it earns",
     "words": "Points"
    },
    {
     "label": "About the points",
     "words": "Points are worth 1 cent on Chase Travel; Points Boost can make some bookings worth up to 2 cents"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "19.74% to 28.24% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "travel and purchase protection limits (the page links to them; from the benefits guide as known in mid 2026)"
    }
   ]
  },
  {
   "id": "chase-freedom-unlimited",
   "bank": "Chase",
   "n": "Freedom Unlimited",
   "network": "Visa",
   "fee": 0,
   "amt": 20000,
   "unit": "ur",
   "spend": 500,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1.5,
    "rates": [
     {
      "cat": "travelPortal",
      "x": 5
     },
     {
      "cat": "dining",
      "x": 3
     },
     {
      "cat": "drugstore",
      "x": 3
     }
    ],
    "picks": [],
    "words": "5% Chase Travel, 3% dining and drugstores, 1.5% everything else"
   },
   "credits": [],
   "source": "The card: https://creditcards.chase.com/all-credit-cards (issuer). The offer: creditcards.chase.com Freedom page",
   "checked": "2026-11-06",
   "has": {
    "rental": true,
    "tripCancel": true,
    "purchase": true,
    "warranty": true,
    "intro0": true
   },
   "hasWords": {
    "rental": "Secondary rental car coverage",
    "tripCancel": "Trip cancellation and interruption, up to $1,500 a person",
    "purchase": "Purchase protection: 120 days, up to $500 an item",
    "warranty": "Extended warranty: one more year on US warranties of 3 years or less",
    "intro0": "15 months on purchases, 15 months on balance transfers"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "$200 cash back, paid as 20,000 points"
    },
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Foreign transaction fee",
     "words": "3% of each purchase abroad"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "18.49% to 27.99% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "benefits (from the Freedom benefits guide as known in mid 2026)"
    }
   ]
  },
  {
   "id": "chase-freedom-flex",
   "bank": "Chase",
   "n": "Freedom Flex",
   "network": "Mastercard",
   "fee": 0,
   "amt": 20000,
   "unit": "ur",
   "spend": 500,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "travelPortal",
      "x": 5
     },
     {
      "cat": "dining",
      "x": 3
     },
     {
      "cat": "drugstore",
      "x": 3
     },
     {
      "cat": "rotating",
      "x": 5,
      "cap": 1500,
      "per": "quarter",
      "then": 1
     }
    ],
    "picks": [],
    "words": "5% on rotating quarterly categories (up to $1,500 a quarter, activate each quarter), 5% Chase Travel, 3% dining and drugstores, 1% everything else"
   },
   "credits": [],
   "source": "The card: https://thepointsguy.com/news/chase-freedom-flex-cellphone-protection-ending/ (secondary). The offer: creditcards.chase.com Freedom page",
   "checked": "2026-11-06",
   "has": {
    "rental": true,
    "tripCancel": true,
    "purchase": true,
    "warranty": true,
    "noForeignFee": true,
    "intro0": true
   },
   "hasWords": {
    "rental": "Secondary rental car coverage",
    "tripCancel": "Trip cancellation and interruption, up to $1,500 a person",
    "purchase": "Purchase protection: 120 days, up to $500 an item",
    "warranty": "Extended warranty: one more year on US warranties of 3 years or less",
    "intro0": "15 months on purchases, 15 months on balance transfers"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "$200 cash back"
    },
    {
     "label": "Where the sources differ",
     "words": "One review site shows $250"
    },
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "18.49% to 27.99% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Note",
     "words": "Cell phone protection ended Sep 20, 2026; the 3% foreign transaction fee ended the same day"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "purchase protection and warranty limits"
    }
   ]
  },
  {
   "id": "chase-freedom-rise",
   "bank": "Chase",
   "n": "Freedom Rise",
   "network": "Visa",
   "fee": 0,
   "amt": 25,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "none",
   "earn": {
    "base": 1.5,
    "rates": [],
    "picks": [],
    "words": "1.5% on everything"
   },
   "credits": [],
   "source": "The card: https://creditcards.chase.com/all-credit-cards (issuer). The offer: upgradedpoints.com/credit-cards/chase (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "purchase": true,
    "starter": true
   },
   "hasWords": {
    "purchase": "Purchase protection: 120 days, up to $500 an item"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "$25 statement credit after setting up automatic payments in the first 3 months"
    },
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Foreign transaction fee",
     "words": "3% of each purchase abroad"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "18.49% to 27.99% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Note",
     "words": "Made for people new to credit"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "benefits and foreign fee"
    }
   ]
  },
  {
   "id": "chase-slate-edge",
   "bank": "Chase",
   "n": "Slate Edge",
   "network": "Visa",
   "fee": 0,
   "amt": 0,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 0,
    "rates": [],
    "picks": [],
    "words": "No rewards"
   },
   "credits": [],
   "source": "The card: https://creditcards.chase.com/all-credit-cards (issuer). The offer: financebuzz.com/chase-credit-cards (Nov 2026)",
   "checked": "2026-11-06",
   "has": {},
   "hasWords": {},
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "No bonus. 0% intro rate for 21 months on purchases and balance transfers"
    },
    {
     "label": "What it earns",
     "words": "None"
    },
    {
     "label": "Foreign transaction fee",
     "words": "3% of each purchase abroad"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "29.24% to 29.24% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Note",
     "words": "For building credit"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "foreign fee"
    }
   ]
  },
  {
   "id": "chase-prime-visa",
   "bank": "Chase",
   "n": "Prime Visa",
   "network": "Visa",
   "fee": 0,
   "amt": 200,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "amazon",
      "x": 5
     },
     {
      "cat": "travelPortal",
      "x": 5
     },
     {
      "cat": "dining",
      "x": 2
     },
     {
      "cat": "gas",
      "x": 2
     },
     {
      "cat": "transit",
      "x": 2
     }
    ],
    "picks": [],
    "words": "5% at Amazon, Whole Foods and Chase Travel (with Prime), 2% gas, restaurants, transit and rideshare, 1% everything else"
   },
   "credits": [],
   "source": "The card: https://creditcards.chase.com/all-credit-cards (issuer). The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026); thepointsparty.com/credit-cards/issuer/chase",
   "checked": "2026-11-06",
   "has": {
    "rental": true,
    "purchase": true,
    "warranty": true,
    "noForeignFee": true,
    "store": true
   },
   "hasWords": {
    "rental": "Secondary rental car coverage",
    "purchase": "Purchase protection: 120 days, up to $500 an item",
    "warranty": "Extended warranty: one more year on US warranties of 3 years or less",
    "store": "Amazon"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "$200 Amazon gift card on approval"
    },
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "18.99% to 27.74% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Note",
     "words": "Needs a Prime membership; the Amazon Visa without Prime earns 3% at Amazon"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "benefits"
    }
   ]
  },
  {
   "id": "chase-amazon-visa",
   "bank": "Chase",
   "n": "Amazon Visa",
   "network": "Visa",
   "fee": 0,
   "amt": 50,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "amazon",
      "x": 3
     },
     {
      "cat": "travelPortal",
      "x": 3
     },
     {
      "cat": "dining",
      "x": 2
     },
     {
      "cat": "gas",
      "x": 2
     },
     {
      "cat": "transit",
      "x": 2
     }
    ],
    "picks": [],
    "words": "3% at Amazon, Whole Foods and Chase Travel, 2% gas, restaurants, transit and rideshare, 1% everything else"
   },
   "credits": [],
   "source": "The card: https://creditcards.chase.com/all-credit-cards (issuer). The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026)",
   "checked": "2026-11-06",
   "has": {
    "purchase": true,
    "warranty": true,
    "noForeignFee": true,
    "store": true
   },
   "hasWords": {
    "purchase": "Purchase protection: 120 days, up to $500 an item",
    "warranty": "Extended warranty: one more year on US warranties of 3 years or less",
    "store": "Amazon"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "$50 Amazon gift card on approval"
    },
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "18.99% to 27.74% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "benefits"
    }
   ]
  },
  {
   "id": "chase-united-explorer",
   "bank": "Chase",
   "n": "United Explorer",
   "network": "Visa",
   "fee": 150,
   "amt": 70000,
   "unit": "united",
   "spend": 3000,
   "months": 3,
   "min": "good",
   "fee1": 0,
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "airline",
      "x": 2
     },
     {
      "cat": "dining",
      "x": 2
     },
     {
      "cat": "hotel",
      "x": 2
     }
    ],
    "picks": [],
    "words": "2x United, dining and hotels booked direct, 1x everything else"
   },
   "credits": [
    {
     "name": "Free first checked bag",
     "value": 140,
     "words": "For you and a companion on United; about $140 a year on two round trips"
    },
    {
     "name": "Two United Club passes",
     "value": 0,
     "words": "Two one-time passes a year; counted only if used"
    },
    {
     "name": "Partner credits",
     "value": 0,
     "words": "Rideshare, hotel and other partner credits; counted only if used"
    }
   ],
   "source": "The card: https://creditcards.chase.com/all-credit-cards (issuer). The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026)",
   "checked": "2026-11-06",
   "has": {
    "rental": true,
    "tripCancel": true,
    "tripDelay": true,
    "baggage": true,
    "purchase": true,
    "warranty": true,
    "noForeignFee": true,
    "bag": true
   },
   "hasWords": {
    "rental": "Primary rental car coverage",
    "tripCancel": "Trip cancellation and interruption",
    "tripDelay": "Trip delay over 6 hours",
    "baggage": "Lost and delayed baggage",
    "purchase": "Purchase protection",
    "warranty": "Extended warranty",
    "bag": "For you and a companion on United; about $140 a year on two round trips"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "70,000 miles, plus 10,000 for adding an authorized user. $0 fee the first year"
    },
    {
     "label": "What it earns",
     "words": "Miles"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "19.99% to 28.49% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Note",
     "words": "$0 the first year"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "earn rates and protections (not on the all-cards page)"
    }
   ]
  },
  {
   "id": "chase-united-quest",
   "bank": "Chase",
   "n": "United Quest",
   "network": "Visa",
   "fee": 350,
   "amt": 80000,
   "unit": "united",
   "spend": 4000,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "airline",
      "x": 3
     },
     {
      "cat": "dining",
      "x": 2
     },
     {
      "cat": "streaming",
      "x": 2
     },
     {
      "cat": "travel",
      "x": 2
     }
    ],
    "picks": [],
    "words": "3x United, 2x dining, streaming and other travel, 1x everything else"
   },
   "credits": [
    {
     "name": "United travel credit",
     "value": 200,
     "words": "$200 a year on United purchases"
    },
    {
     "name": "10,000-mile award discount",
     "value": 0,
     "words": "Counted only if the client books an award"
    },
    {
     "name": "Two free checked bags",
     "value": 0,
     "words": "Counted only if the client flies United"
    }
   ],
   "source": "The card: https://creditcards.chase.com/all-credit-cards (issuer). The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026); thepointsparty.com/credit-cards/issuer/chase",
   "checked": "2026-11-06",
   "has": {
    "rental": true,
    "tripCancel": true,
    "tripDelay": true,
    "baggage": true,
    "purchase": true,
    "warranty": true,
    "noForeignFee": true,
    "bag": true
   },
   "hasWords": {
    "rental": "Primary rental car coverage",
    "tripCancel": "Trip cancellation and interruption",
    "tripDelay": "Trip delay",
    "baggage": "Lost and delayed baggage",
    "purchase": "Purchase protection",
    "warranty": "Extended warranty",
    "bag": "Counted only if the client flies United"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "80,000 miles and 500 PQP, plus 10,000 miles for adding an authorized user"
    },
    {
     "label": "What it earns",
     "words": "Miles"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "19.99% to 28.49% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "earn rates and protections"
    }
   ]
  },
  {
   "id": "chase-southwest-plus",
   "bank": "Chase",
   "n": "Southwest Plus",
   "network": "Visa",
   "fee": 99,
   "amt": 80000,
   "unit": "southwest",
   "spend": 1000,
   "months": 3,
   "min": "good",
   "ends": "2026-12-02",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "airline",
      "x": 2
     }
    ],
    "picks": [],
    "words": "2x Southwest, 1x everything else"
   },
   "credits": [
    {
     "name": "3,000 anniversary points",
     "value": 39,
     "words": "About $39 at 1.3 cents a point"
    },
    {
     "name": "First checked bag free",
     "value": 0,
     "words": "Counted only if the client flies Southwest"
    }
   ],
   "source": "The card: https://creditcards.chase.com/all-credit-cards (issuer). The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026)",
   "checked": "2026-11-06",
   "has": {
    "baggage": true,
    "purchase": true,
    "warranty": true,
    "bag": true
   },
   "hasWords": {
    "baggage": "Lost and delayed baggage",
    "purchase": "Purchase protection",
    "warranty": "Extended warranty",
    "bag": "Counted only if the client flies Southwest"
   },
   "unique": [
    {
     "label": "Where the sources differ",
     "words": "Another site shows 50,000 points"
    },
    {
     "label": "What it earns",
     "words": "Points"
    },
    {
     "label": "Foreign transaction fee",
     "words": "3% of each purchase abroad"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "19.49% to 27.99% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "protections and foreign fee"
    }
   ]
  },
  {
   "id": "chase-southwest-priority",
   "bank": "Chase",
   "n": "Southwest Priority",
   "network": "Visa",
   "fee": 229,
   "amt": 90000,
   "unit": "southwest",
   "spend": 3000,
   "months": 3,
   "min": "good",
   "ends": "2026-12-02",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "airline",
      "x": 4
     },
     {
      "cat": "gas",
      "x": 2
     },
     {
      "cat": "dining",
      "x": 2
     }
    ],
    "picks": [],
    "words": "4x Southwest, 2x gas and restaurants, 1x everything else"
   },
   "credits": [
    {
     "name": "7,500 anniversary points",
     "value": 98,
     "words": "About $98 at 1.3 cents a point"
    },
    {
     "name": "First checked bag free",
     "value": 0,
     "words": "Counted only if the client flies Southwest"
    }
   ],
   "source": "The card: https://creditcards.chase.com/all-credit-cards (issuer). The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026); financebuzz.com/chase-credit-cards (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "tripDelay": true,
    "baggage": true,
    "purchase": true,
    "warranty": true,
    "noForeignFee": true,
    "bag": true
   },
   "hasWords": {
    "tripDelay": "Trip delay",
    "baggage": "Lost and delayed baggage",
    "purchase": "Purchase protection",
    "warranty": "Extended warranty",
    "bag": "Counted only if the client flies Southwest"
   },
   "unique": [
    {
     "label": "Where the sources differ",
     "words": "Another site shows 60,000 points"
    },
    {
     "label": "What it earns",
     "words": "Points"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "19.49% to 27.99% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "protections"
    }
   ]
  },
  {
   "id": "chase-marriott-boundless",
   "bank": "Chase",
   "n": "Marriott Bonvoy Boundless",
   "network": "Visa",
   "fee": 95,
   "amt": null,
   "unit": "marriott",
   "spend": 3000,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 2,
    "rates": [
     {
      "cat": "hotel",
      "x": 6
     }
    ],
    "picks": [
     {
      "x": 3,
      "count": 3,
      "from": [
       "groceries",
       "gas",
       "dining"
      ],
      "cap": 6000,
      "per": "year",
      "then": 2
     }
    ],
    "words": "Up to 17x at Marriott, 3x on groceries, gas and dining (first $6,000 a year), 2x everything else"
   },
   "credits": [
    {
     "name": "Free night each anniversary",
     "value": 150,
     "words": "A night up to 35,000 points; about $150 if the client stays at Marriott"
    },
    {
     "name": "Airline credit",
     "value": 100,
     "words": "Up to $100 in airline statement credits, through Jun 30, 2027"
    }
   ],
   "source": "The card: https://creditcards.chase.com/all-credit-cards (issuer). The offer: financebuzz.com/chase-credit-cards (Nov 2026); nerdwallet.com best bonus offers (Nov 2026); thepointsparty.com/credit-cards/issuer/chase; yourbestcards.com/chase-credit-cards (page dated Oct 2026)",
   "checked": "2026-11-06",
   "has": {
    "rental": true,
    "tripDelay": true,
    "baggage": true,
    "purchase": true,
    "noForeignFee": true,
    "night": true
   },
   "hasWords": {
    "rental": "Secondary rental car coverage",
    "tripDelay": "Trip delay",
    "baggage": "Lost and delayed baggage",
    "purchase": "Purchase protection",
    "night": "A night up to 35,000 points; about $150 if the client stays at Marriott"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "3 free night awards after $3,000 in 3 months (two sites today; one older page shows 200,000 points)"
    },
    {
     "label": "Where the sources differ",
     "words": "Sites disagree on the offer, so no dollar value is counted"
    },
    {
     "label": "Why no dollar value",
     "words": "Its offer is free nights, which this page does not put a dollar value on."
    },
    {
     "label": "What it earns",
     "words": "Points"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "19.49% to 27.99% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "groceries, gas and dining 3x (from mid 2026); protections"
    }
   ]
  },
  {
   "id": "chase-ihg-premier",
   "bank": "Chase",
   "n": "IHG One Rewards Premier",
   "network": "Mastercard",
   "fee": 150,
   "amt": 180000,
   "unit": "ihg",
   "spend": 3000,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 3,
    "rates": [
     {
      "cat": "hotel",
      "x": 10
     },
     {
      "cat": "travel",
      "x": 5
     },
     {
      "cat": "dining",
      "x": 5
     },
     {
      "cat": "gas",
      "x": 5
     }
    ],
    "picks": [],
    "words": "Up to 26x at IHG, 5x travel, dining and gas, 3x everything else"
   },
   "credits": [
    {
     "name": "Free night each anniversary",
     "value": 150,
     "words": "A night up to 40,000 points; about $150 if the client stays at IHG"
    },
    {
     "name": "Global Entry or TSA PreCheck",
     "value": 30,
     "words": "Up to $120 every 4 years"
    }
   ],
   "source": "The card: https://creditcards.chase.com/all-credit-cards (issuer). The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026); thepointsparty.com/credit-cards/issuer/chase; financebuzz.com/chase-credit-cards (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "tripCancel": true,
    "tripDelay": true,
    "baggage": true,
    "purchase": true,
    "noForeignFee": true,
    "night": true,
    "trusted": true
   },
   "hasWords": {
    "tripCancel": "Trip cancellation",
    "tripDelay": "Trip delay",
    "baggage": "Lost and delayed baggage",
    "purchase": "Purchase protection",
    "night": "A night up to 40,000 points; about $150 if the client stays at IHG",
    "trusted": "Up to $120 every 4 years"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "180,000 points, limited time"
    },
    {
     "label": "What it earns",
     "words": "Points"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "19.49% to 27.99% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "category rates beyond IHG; protections"
    }
   ]
  },
  {
   "id": "chase-world-of-hyatt",
   "bank": "Chase",
   "n": "World of Hyatt",
   "network": "Visa",
   "fee": 95,
   "amt": null,
   "unit": "hyatt",
   "spend": 5000,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "hotel",
      "x": 4
     },
     {
      "cat": "dining",
      "x": 2
     },
     {
      "cat": "airline",
      "x": 2
     },
     {
      "cat": "transit",
      "x": 2
     }
    ],
    "picks": [],
    "words": "Up to 9x at Hyatt, 2x dining, airlines, transit, gym, 1x everything else"
   },
   "credits": [
    {
     "name": "Free night each anniversary",
     "value": 150,
     "words": "A Category 1 to 4 night; about $150 if the client stays at Hyatt"
    }
   ],
   "source": "The card: https://creditcards.chase.com/all-credit-cards (issuer). The offer: financebuzz.com/chase-credit-cards (Nov 2026); nerdwallet.com best bonus offers (Nov 2026); thepointsparty.com/credit-cards/issuer/chase; yourbestcards.com/chase-credit-cards (page dated Oct 2026)",
   "checked": "2026-11-06",
   "has": {
    "rental": true,
    "tripCancel": true,
    "tripDelay": true,
    "baggage": true,
    "purchase": true,
    "noForeignFee": true,
    "night": true
   },
   "hasWords": {
    "rental": "Secondary rental car coverage",
    "tripCancel": "Trip cancellation",
    "tripDelay": "Trip delay",
    "baggage": "Lost luggage",
    "purchase": "Purchase protection",
    "night": "A Category 1 to 4 night; about $150 if the client stays at Hyatt"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "4 free nights after $5,000 in 3 months (three sites; one older page shows up to 60,000 points)"
    },
    {
     "label": "Where the sources differ",
     "words": "Sites disagree on the offer, so no dollar value is counted"
    },
    {
     "label": "Why no dollar value",
     "words": "Its offer is free nights, which this page does not put a dollar value on."
    },
    {
     "label": "What it earns",
     "words": "Points"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "19.49% to 27.99% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "2x categories; protections"
    }
   ]
  },
  {
   "id": "chase-disney-visa",
   "bank": "Chase",
   "n": "Disney Visa",
   "network": "Visa",
   "fee": 0,
   "amt": 150,
   "unit": "disney",
   "spend": 500,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [],
    "picks": [],
    "words": "1% in Disney Rewards Dollars on everything"
   },
   "credits": [],
   "source": "The card: https://creditcards.chase.com/all-credit-cards (issuer). The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026)",
   "checked": "2026-11-06",
   "has": {},
   "hasWords": {},
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "$100 Disney gift card on approval plus a $50 statement credit"
    },
    {
     "label": "What it earns",
     "words": "Points"
    },
    {
     "label": "Foreign transaction fee",
     "words": "3% of each purchase abroad"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "18.49% to 27.99% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "earn rate and fee"
    }
   ]
  },
  {
   "id": "chase-doordash",
   "bank": "Chase",
   "n": "DoorDash Rewards Mastercard",
   "network": "Mastercard",
   "fee": 0,
   "amt": 0,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "delivery",
      "x": 4
     },
     {
      "cat": "dining",
      "x": 3
     },
     {
      "cat": "groceries",
      "x": 2
     }
    ],
    "picks": [],
    "words": "4% DoorDash and Caviar, 3% dining direct, 2% groceries, 1% everything else"
   },
   "credits": [
    {
     "name": "A free year of DashPass",
     "value": 0,
     "words": "Renews at $96 a year unless cancelled"
    }
   ],
   "source": "The card: https://creditcards.chase.com/all-credit-cards (issuer). The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026)",
   "checked": "2026-11-06",
   "has": {
    "noForeignFee": true
   },
   "hasWords": {},
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "A free year of DashPass, not counted in dollars"
    },
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "18.49% to 27.99% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "foreign fee"
    }
   ]
  },
  {
   "id": "Sapphire Reserve for Business",
   "bank": "Chase",
   "n": "Sapphire Reserve for Business",
   "network": "Visa",
   "fee": 795,
   "amt": 200000,
   "unit": "ur",
   "spend": 30000,
   "months": 6,
   "min": "excellent",
   "biz": 1,
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "travelPortal",
      "x": 8
     },
     {
      "cat": "airline",
      "x": 4
     },
     {
      "cat": "hotel",
      "x": 4
     }
    ],
    "picks": [],
    "words": "8x Chase Travel, 4x flights and hotels booked direct, 3x social media and search ads (first $1 million a year), 1x other"
   },
   "credits": [
    {
     "name": "Travel credit",
     "value": 300,
     "words": "Up to $300 a year on travel purchases, applied by itself"
    },
    {
     "name": "The Edit hotel credit",
     "value": 500,
     "words": "Up to $500 a year for stays booked with The Edit on Chase Travel"
    },
    {
     "name": "Google Workspace credit",
     "value": 200,
     "words": "Up to $200 a year"
    },
    {
     "name": "ZipRecruiter credit",
     "value": 400,
     "words": "Up to $400 a year on purchases made with ZipRecruiter"
    },
    {
     "name": "Giftcards.com credit",
     "value": 100,
     "words": "Up to $100 a year, $50 each half year"
    },
    {
     "name": "Global Entry or TSA PreCheck",
     "value": 30,
     "words": "Up to $120 every 4 years ($30 a year spread)"
    }
   ],
   "source": "The card: Search results that quote chase.com/sapphire-cards/business/reserve and creditcards.chase.com/business-credit-cards/sapphire/reserve (issuer), cnbc.com/select and bankrate.com reviews. The network and the transfer partners are general knowledge, not quoted by the search. The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026); thepointsparty.com/credit-cards/issuer/chase (secondary)",
   "checked": "2026-11-23",
   "has": {
    "transfer": true,
    "noForeignFee": true,
    "lounge": true,
    "status": true,
    "trusted": true
   },
   "hasWords": {
    "transfer": "Chase points move to airline and hotel partners",
    "noForeignFee": "No foreign transaction fee",
    "lounge": "Chase Sapphire Lounges and Priority Pass lounges, with up to two guests",
    "status": "IHG One Rewards Platinum Elite through Dec 31, 2027 (link your IHG account first)",
    "trusted": "Up to $120 every 4 years ($30 a year spread)"
   },
   "unique": [
    {
     "label": "Lyft",
     "words": "5x on Lyft rides through Sep 30, 2027"
    },
    {
     "label": "Note",
     "words": "Chase says The Edit credit grows to up to $1,000 a year from Jan 1, 2027. Rental car and trip covers were not shown by the search, so they are left out"
    }
   ]
  },
  {
   "id": "Ink Business Preferred",
   "bank": "Chase",
   "n": "Ink Business Preferred",
   "network": "Visa",
   "fee": 95,
   "amt": 100000,
   "unit": "ur",
   "spend": 8000,
   "months": 3,
   "min": "good",
   "biz": 1,
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "travel",
      "x": 3,
      "cap": 150000,
      "per": "year",
      "then": 1
     },
     {
      "cat": "phone",
      "x": 3,
      "cap": 150000,
      "per": "year",
      "then": 1
     }
    ],
    "picks": [],
    "words": "3x on the first $150,000 a year (combined) in shipping, social media and search ads, internet, cable, phone and travel; 1x other"
   },
   "credits": [
    {
     "name": "DashPass membership",
     "value": 0,
     "words": "A free year of DashPass when you activate by Dec 31, 2027; not counted in dollars"
    }
   ],
   "source": "The card: Search results that quote creditcards.chase.com/business-credit-cards/ink/business-preferred (issuer) and bankrate.com, financebuzz.com reviews. The network is general knowledge, not quoted by the search. The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026); thepointsparty.com/credit-cards/issuer/chase (secondary)",
   "checked": "2026-11-23",
   "has": {
    "transfer": true,
    "noForeignFee": true,
    "rental": true,
    "tripCancel": true,
    "cellPhone": true,
    "purchase": true,
    "warranty": true
   },
   "hasWords": {
    "transfer": "Chase points move to airline and hotel partners",
    "noForeignFee": "No foreign transaction fee",
    "rental": "Primary when you rent for business",
    "tripCancel": "Up to $5,000 a person and $10,000 a trip",
    "cellPhone": "Up to $1,000 a claim, $100 deductible, 3 claims a year, when the phone bill is paid with the card",
    "purchase": "120 days, up to $10,000 a claim",
    "warranty": "Extended warranty protection"
   },
   "unique": [
    {
     "label": "Lyft",
     "words": "5x on Lyft rides through Sep 30, 2027"
    },
    {
     "label": "Note",
     "words": "The $150,000 limit is one limit for all 3x categories together"
    }
   ]
  },
  {
   "id": "Ink Business Cash",
   "bank": "Chase",
   "n": "Ink Business Cash",
   "network": "Visa",
   "fee": 0,
   "amt": 75000,
   "unit": "ur",
   "spend": 6000,
   "months": 3,
   "min": "good",
   "biz": 1,
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "phone",
      "x": 5,
      "cap": 25000,
      "per": "year",
      "then": 1
     },
     {
      "cat": "gas",
      "x": 2,
      "cap": 25000,
      "per": "year",
      "then": 1
     },
     {
      "cat": "dining",
      "x": 2,
      "cap": 25000,
      "per": "year",
      "then": 1
     }
    ],
    "picks": [],
    "words": "5% on the first $25,000 a year (combined) at office supply stores and on internet, cable and phone; 2% on the first $25,000 a year (combined) at gas stations and restaurants; 1% other"
   },
   "credits": [],
   "source": "The card: Search results that quote creditcards.chase.com/business-credit-cards/ink/cash and the Chase business compare page (issuer) and financebuzz.com. The network is general knowledge, not quoted by the search. The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026); thepointsparty.com/credit-cards/issuer/chase (secondary)",
   "checked": "2026-11-23",
   "has": {
    "intro0": true,
    "purchase": true,
    "warranty": true
   },
   "hasWords": {
    "intro0": "0% for 12 months on purchases",
    "purchase": "120 days, up to $10,000 a claim",
    "warranty": "Extended warranty protection"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "$750 cash back"
    },
    {
     "label": "Foreign transaction fee",
     "words": "3% of each purchase made outside the US"
    },
    {
     "label": "Lyft",
     "words": "5% on Lyft rides through Sep 30, 2027"
    }
   ]
  },
  {
   "id": "Ink Business Unlimited",
   "bank": "Chase",
   "n": "Ink Business Unlimited",
   "network": "Visa",
   "fee": 0,
   "amt": 75000,
   "unit": "ur",
   "spend": 6000,
   "months": 3,
   "min": "good",
   "biz": 1,
   "earn": {
    "base": 1.5,
    "rates": [],
    "picks": [],
    "words": "1.5% on everything"
   },
   "credits": [],
   "source": "The card: Search results that quote creditcards.chase.com/business-credit-cards/ink/unlimited and the Chase business compare page (issuer) and cnbc.com/select/chase-ink-business-cards. The network is general knowledge, not quoted by the search. The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026); thepointsparty.com/credit-cards/issuer/chase (secondary)",
   "checked": "2026-11-23",
   "has": {
    "intro0": true,
    "pool": true,
    "purchase": true,
    "warranty": true
   },
   "hasWords": {
    "intro0": "0% for 12 months on purchases",
    "pool": "Rewards can move to airlines and hotels only when you also hold another Chase points card",
    "purchase": "120 days, up to $10,000 a claim",
    "warranty": "Extended warranty protection"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "$750 cash back"
    },
    {
     "label": "Foreign transaction fee",
     "words": "3% of each purchase made outside the US"
    },
    {
     "label": "Lyft",
     "words": "5% on Lyft rides through Sep 30, 2027"
    }
   ]
  },
  {
   "id": "Ink Business Premier",
   "bank": "Chase",
   "n": "Ink Business Premier",
   "network": "Visa",
   "fee": 195,
   "amt": 1000,
   "unit": "cash",
   "spend": 10000,
   "months": 3,
   "min": "excellent",
   "biz": 1,
   "earn": {
    "base": 2,
    "rates": [
     {
      "cat": "travelPortal",
      "x": 5
     }
    ],
    "picks": [],
    "words": "2.5% on each purchase of $5,000 or more, 2% other, 5% Chase Travel"
   },
   "credits": [],
   "source": "The card: Search results that quote creditcards.chase.com/business-credit-cards/ink/premier and chase.com ink-business-premier-credit-card-benefits (issuer), bankrate.com and cnbc.com reviews. The network is general knowledge, not quoted by the search. The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026); thepointsparty.com/credit-cards/issuer/chase (secondary)",
   "checked": "2026-11-23",
   "has": {
    "noForeignFee": true,
    "rental": true,
    "tripCancel": true,
    "cellPhone": true,
    "purchase": true,
    "warranty": true
   },
   "hasWords": {
    "noForeignFee": "No foreign transaction fee",
    "rental": "Primary when you rent for business or outside the US",
    "tripCancel": "Trip cancellation and interruption cover",
    "cellPhone": "Cell phone protection",
    "purchase": "120 days, up to $10,000 a claim",
    "warranty": "Extended warranty protection"
   },
   "unique": [
    {
     "label": "Large purchases",
     "words": "2.5% on each single purchase of $5,000 or more"
    },
    {
     "label": "Pay in full",
     "words": "The balance is due in full each month. Flex for Business lets some purchases be paid over time, with interest"
    },
    {
     "label": "About the rewards",
     "words": "Rewards do not move to other Chase cards or to airlines and hotels"
    }
   ]
  },
  {
   "id": "United Gateway",
   "bank": "Chase",
   "n": "United Gateway",
   "network": "Visa",
   "fee": 0,
   "amt": 40000,
   "unit": "united",
   "spend": 1000,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "airline",
      "x": 2
     },
     {
      "cat": "gas",
      "x": 2
     },
     {
      "cat": "transit",
      "x": 2
     }
    ],
    "picks": [],
    "words": "2x United, gas, local transit and commuting; 1x other"
   },
   "credits": [],
   "source": "The card: Search results that quote creditcards.chase.com/travel-credit-cards/united/united-gateway (issuer) and nerdwallet.com, onemileatatime.com reviews. The network is general knowledge, not quoted by the search. The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026); thepointsparty.com/credit-cards/issuer/chase (secondary)",
   "checked": "2026-11-23",
   "has": {
    "intro0": true,
    "noForeignFee": true
   },
   "hasWords": {
    "intro0": "0% for 12 months on purchases",
    "noForeignFee": "No foreign transaction fee"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "40,000 miles, plus 10,000 for adding an authorized user"
    },
    {
     "label": "On the plane",
     "words": "25% back on food, drinks and Wi-Fi on United flights"
    }
   ]
  },
  {
   "id": "United Club",
   "bank": "Chase",
   "n": "United Club",
   "network": "Visa",
   "fee": 695,
   "amt": 90000,
   "unit": "united",
   "spend": 5000,
   "months": 3,
   "min": "excellent",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "airline",
      "x": 5
     },
     {
      "cat": "dining",
      "x": 2
     },
     {
      "cat": "travel",
      "x": 2
     }
    ],
    "picks": [],
    "words": "5x United (4x before April 2, 2026), 2x dining and other travel, 1x other"
   },
   "credits": [
    {
     "name": "JSX credit",
     "value": 200,
     "words": "Up to $200 each card year on flights booked with JSX"
    }
   ],
   "source": "The card: Search results that quote creditcards.chase.com/travel-credit-cards/united/club-infinite (issuer), awardwallet.com mileage-earning-changes-2026, thepointsguy.com and nerdwallet.com reviews. The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026); financebuzz.com/chase-credit-cards (Nov 2026) (secondary)",
   "checked": "2026-11-23",
   "has": {
    "lounge": true,
    "bag": true,
    "trusted": true
   },
   "hasWords": {
    "lounge": "United Club membership for you and eligible companions",
    "bag": "First and second checked bag free for you and one companion",
    "trusted": "Credit for Global Entry, TSA PreCheck or NEXUS"
   },
   "unique": [
    {
     "label": "Where the sources differ",
     "words": "Another site shows up to 100,000 miles"
    },
    {
     "label": "At the airport",
     "words": "Premier Access for you and companions on the same booking"
    },
    {
     "label": "Note",
     "words": "The library line says 4x United. Chase and AwardWallet show 5x since April 2, 2026. The foreign fee and the other partner credits were not shown by the search"
    }
   ]
  },
  {
   "id": "United Business",
   "bank": "Chase",
   "n": "United Business",
   "network": "Visa",
   "fee": 150,
   "amt": 100000,
   "unit": "united",
   "spend": 5000,
   "months": 3,
   "min": "good",
   "biz": 1,
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "airline",
      "x": 2
     },
     {
      "cat": "dining",
      "x": 2
     },
     {
      "cat": "gas",
      "x": 2
     },
     {
      "cat": "transit",
      "x": 2
     }
    ],
    "picks": [],
    "words": "2x United, dining, gas, office supply stores, local transit and commuting; 1x other"
   },
   "credits": [],
   "source": "The card: Search results that quote creditcards.chase.com/business-credit-cards/united/united-business-card and chase.com/business/credit-cards/united-business-cards/united-business-card (issuer), creditcards.com review. The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026); thepointsparty.com/credit-cards/issuer/chase (secondary)",
   "checked": "2026-11-23",
   "has": {
    "noForeignFee": true,
    "bag": true,
    "rental": true,
    "tripCancel": true,
    "baggage": true,
    "purchase": true,
    "warranty": true
   },
   "hasWords": {
    "noForeignFee": "No foreign transaction fee",
    "bag": "First checked bag free for you and one companion",
    "rental": "Primary, up to $60,000 for theft and collision damage (decline the counter coverage)",
    "tripCancel": "Up to $1,500 a person and $6,000 a trip",
    "baggage": "Bag late by more than 6 hours: up to $100 a day for 3 days",
    "purchase": "Purchase protection",
    "warranty": "Extended warranty protection"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "100,000 miles and 2,000 PQP, plus 10,000 miles for adding an employee card"
    },
    {
     "label": "Lounge passes",
     "words": "2 United Club one-time passes each year"
    },
    {
     "label": "On the plane",
     "words": "25% back on food, drinks and Wi-Fi on United flights"
    },
    {
     "label": "Note",
     "words": "Chase names more than $600 a year in partner credits; the search did not show each amount, so none is listed"
    }
   ]
  },
  {
   "id": "United Club Business",
   "bank": "Chase",
   "n": "United Club Business",
   "network": "Visa",
   "fee": 695,
   "amt": 100000,
   "unit": "united",
   "spend": 5000,
   "months": 3,
   "min": "good",
   "biz": 1,
   "earn": {
    "base": 1.5,
    "rates": [
     {
      "cat": "airline",
      "x": 2
     }
    ],
    "picks": [],
    "words": "2x United, 5x prepaid stays with Renowned Hotels and Resorts, 1.5x other"
   },
   "credits": [
    {
     "name": "Renowned Hotels and Resorts credit",
     "value": 200,
     "words": "Up to $200 a year on prepaid stays"
    },
    {
     "name": "Rideshare credit",
     "value": 150,
     "words": "Up to $150 a calendar year, paid monthly, after you enroll"
    },
    {
     "name": "Instacart credit",
     "value": 240,
     "words": "Two $10 credits a month, up to $240 a calendar year, through Dec 31, 2027"
    },
    {
     "name": "JSX credit",
     "value": 200,
     "words": "Up to $200 each card year on flights booked with JSX"
    },
    {
     "name": "Avis or Budget travel credit",
     "value": 100,
     "words": "Up to $100 each card year in United TravelBank cash for car rentals"
    },
    {
     "name": "FareLock credit",
     "value": 50,
     "words": "Up to $50 each card year on United FareLock"
    }
   ],
   "source": "The card: Search results that quote creditcards.chase.com/business-credit-cards/united/united-club-business and chase.com/business/credit-cards/united-business-cards/united-club-card (issuer). The network is general knowledge, not quoted by the search. The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026) (secondary)",
   "checked": "2026-11-23",
   "has": {
    "lounge": true,
    "bag": true
   },
   "hasWords": {
    "lounge": "United Club membership for you and eligible companions",
    "bag": "First and second checked bag free for you and one companion"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "100,000 miles and 2,000 PQP"
    }
   ]
  },
  {
   "id": "Southwest Premier",
   "bank": "Chase",
   "n": "Southwest Premier",
   "network": "Visa",
   "fee": 149,
   "amt": 85000,
   "unit": "southwest",
   "spend": 2000,
   "months": 3,
   "min": "good",
   "ends": "2026-12-02",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "airline",
      "x": 3
     },
     {
      "cat": "groceries",
      "x": 2,
      "cap": 8000,
      "per": "year",
      "then": 1
     },
     {
      "cat": "dining",
      "x": 2,
      "cap": 8000,
      "per": "year",
      "then": 1
     }
    ],
    "picks": [],
    "words": "3x Southwest, 2x groceries and restaurants on the first $8,000 a year (combined), 1x other"
   },
   "credits": [],
   "source": "The card: Search results that quote southwest.com/cardmember-benefits and creditcards.chase.com/travel-credit-cards/southwest/premier (issuer), nerdwallet.com review. The network is general knowledge, not quoted by the search. The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026) (secondary)",
   "checked": "2026-11-23",
   "has": {
    "noForeignFee": true,
    "bag": true
   },
   "hasWords": {
    "noForeignFee": "No foreign transaction fee",
    "bag": "First checked bag free for you and up to 8 people on the same booking"
   },
   "unique": [
    {
     "label": "Each card year",
     "words": "6,000 points on the card anniversary"
    },
    {
     "label": "Seats and boarding",
     "words": "Boarding with Group 5 and a seat pick within 48 hours of the flight, when seats are open"
    },
    {
     "label": "Flight discount",
     "words": "One 15% promotion code each card year"
    }
   ]
  },
  {
   "id": "Southwest Premier Business",
   "bank": "Chase",
   "n": "Southwest Premier Business",
   "network": "Visa",
   "fee": 149,
   "amt": 60000,
   "unit": "southwest",
   "spend": 3000,
   "months": 3,
   "min": "good",
   "biz": 1,
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "airline",
      "x": 3
     },
     {
      "cat": "gas",
      "x": 2,
      "cap": 8000,
      "per": "year",
      "then": 1
     },
     {
      "cat": "dining",
      "x": 2,
      "cap": 8000,
      "per": "year",
      "then": 1
     }
    ],
    "picks": [],
    "words": "3x Southwest, 2x gas and restaurants on the first $8,000 a year (combined), 1x other"
   },
   "credits": [],
   "source": "The card: Search results that quote southwest.com business cards page and creditcards.chase.com/business-credit-cards/southwest/premier-business (issuer), awardwallet.com and thepointsguy.com. The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026); thepointsparty.com/credit-cards/issuer/chase (secondary)",
   "checked": "2026-11-23",
   "has": {
    "noForeignFee": true,
    "bag": true
   },
   "hasWords": {
    "noForeignFee": "No foreign transaction fee",
    "bag": "First checked bag free for you and up to 8 people on the same booking"
   },
   "unique": [
    {
     "label": "Each card year",
     "words": "6,000 points on the card anniversary"
    },
    {
     "label": "Seats and boarding",
     "words": "Boarding with Group 5 and a seat pick within 48 hours of the flight, when seats are open"
    },
    {
     "label": "Flight discount",
     "words": "One 15% promotion code each card year"
    },
    {
     "label": "Employee cards",
     "words": "Free"
    }
   ]
  },
  {
   "id": "Southwest Performance Business",
   "bank": "Chase",
   "n": "Southwest Performance Business",
   "network": "Visa",
   "fee": 299,
   "amt": 80000,
   "unit": "southwest",
   "spend": 5000,
   "months": 3,
   "min": "good",
   "biz": 1,
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "airline",
      "x": 4
     },
     {
      "cat": "gas",
      "x": 2
     },
     {
      "cat": "dining",
      "x": 2
     },
     {
      "cat": "hotel",
      "x": 2
     },
     {
      "cat": "transit",
      "x": 2
     }
    ],
    "picks": [],
    "words": "4x Southwest, 2x gas, restaurants, hotels booked direct, local transit and rideshare; 1x other"
   },
   "credits": [
    {
     "name": "Global Entry or TSA PreCheck",
     "value": 30,
     "words": "Up to $120 every 4 years ($30 a year spread)"
    }
   ],
   "source": "The card: Search results that quote creditcards.chase.com/business-credit-cards/southwest/performance-business and southwest.com cardmember benefits (issuer), financebuzz.com and cnbc.com reviews. The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026); thepointsparty.com/credit-cards/issuer/chase (secondary)",
   "checked": "2026-11-23",
   "has": {
    "noForeignFee": true,
    "bag": true,
    "trusted": true,
    "rental": true,
    "baggage": true,
    "purchase": true,
    "warranty": true
   },
   "hasWords": {
    "noForeignFee": "No foreign transaction fee",
    "bag": "First checked bag free for you and up to 8 people on the same booking",
    "trusted": "Up to $120 every 4 years for Global Entry, TSA PreCheck or NEXUS",
    "rental": "Rental car collision cover",
    "baggage": "Lost and delayed baggage",
    "purchase": "Purchase protection",
    "warranty": "Extended warranty protection"
   },
   "unique": [
    {
     "label": "Each card year",
     "words": "9,000 points after the card anniversary"
    },
    {
     "label": "On the plane",
     "words": "25% back on drinks and Wi-Fi"
    },
    {
     "label": "Seats",
     "words": "A preferred seat at booking and an extra legroom seat within 48 hours of the flight, when seats are open"
    },
    {
     "label": "Employee cards",
     "words": "Free"
    }
   ]
  },
  {
   "id": "Marriott Bonvoy Bold",
   "bank": "Chase",
   "n": "Marriott Bonvoy Bold",
   "network": "Visa",
   "fee": 0,
   "amt": 45000,
   "unit": "marriott",
   "spend": 1000,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "hotel",
      "x": 3
     },
     {
      "cat": "groceries",
      "x": 2
     },
     {
      "cat": "delivery",
      "x": 2
     },
     {
      "cat": "streaming",
      "x": 2
     },
     {
      "cat": "phone",
      "x": 2
     }
    ],
    "picks": [],
    "words": "3x Marriott hotels; 2x groceries, rideshare, select food delivery, select streaming, internet, cable and phone; 1x other"
   },
   "credits": [],
   "source": "The card: Search results that quote creditcards.chase.com/travel-credit-cards/marriott-bonvoy/bold and marriott.com/credit-cards/chase-credit-cards.mi (issuer and hotel). The network is general knowledge, not quoted by the search. The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026); thepointsparty.com/credit-cards/issuer/chase; financebuzz.com/chase-credit-cards (Nov 2026) (secondary)",
   "checked": "2026-11-23",
   "has": {
    "noForeignFee": true,
    "status": true,
    "baggage": true
   },
   "hasWords": {
    "noForeignFee": "No foreign transaction fee",
    "status": "Marriott Bonvoy Silver Elite each calendar year",
    "baggage": "Lost luggage, up to $3,000 a traveler"
   },
   "unique": [
    {
     "label": "Toward status",
     "words": "5 Elite Night Credits each calendar year"
    }
   ]
  },
  {
   "id": "Marriott Bonvoy Bountiful",
   "bank": "Chase",
   "n": "Marriott Bonvoy Bountiful",
   "network": "Visa",
   "fee": 250,
   "amt": 85000,
   "unit": "marriott",
   "spend": 4000,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 2,
    "rates": [
     {
      "cat": "hotel",
      "x": 6
     },
     {
      "cat": "groceries",
      "x": 4,
      "cap": 15000,
      "per": "year",
      "then": 2
     },
     {
      "cat": "dining",
      "x": 4,
      "cap": 15000,
      "per": "year",
      "then": 2
     }
    ],
    "picks": [],
    "words": "6x Marriott hotels, 4x on the first $15,000 a year (combined) in groceries and dining, 2x other"
   },
   "credits": [],
   "source": "The card: Search results that quote creditcards.chase.com/travel-credit-cards/marriott-bonvoy/bountiful and marriott.chase.com/bountiful (issuer), awardwallet.com. The network is general knowledge, not quoted by the search. The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026); financebuzz.com/chase-credit-cards (Nov 2026) (secondary)",
   "checked": "2026-11-23",
   "has": {
    "noForeignFee": true,
    "status": true,
    "tripDelay": true,
    "baggage": true
   },
   "hasWords": {
    "noForeignFee": "No foreign transaction fee",
    "status": "Marriott Bonvoy Gold Elite each calendar year",
    "tripDelay": "Trip delay cover (the sources do not agree on the amount)",
    "baggage": "Bag late by more than 6 hours: up to $100 a day for 5 days"
   },
   "unique": [
    {
     "label": "Free night after spending",
     "words": "One free night (up to 50,000 points) after $15,000 in purchases in a calendar year"
    },
    {
     "label": "Toward status",
     "words": "15 Elite Night Credits each year"
    }
   ]
  },
  {
   "id": "IHG One Rewards Traveler",
   "bank": "Chase",
   "n": "IHG One Rewards Traveler",
   "network": "Mastercard",
   "fee": 0,
   "amt": 125000,
   "unit": "ihg",
   "spend": 2000,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 2,
    "rates": [
     {
      "cat": "hotel",
      "x": 5
     },
     {
      "cat": "dining",
      "x": 3
     },
     {
      "cat": "gas",
      "x": 3
     },
     {
      "cat": "streaming",
      "x": 3
     },
     {
      "cat": "phone",
      "x": 3
     }
    ],
    "picks": [],
    "words": "5x IHG hotels; 3x dining, gas, select streaming and utilities (internet, cable and phone count); 2x other"
   },
   "credits": [],
   "source": "The card: Search results that quote creditcards.chase.com/travel-credit-cards/ihg-rewards-club/traveler and chase.com/personal/credit-cards/ihg/traveler/earn-rewards (issuer), media.chase.com IHG portfolio news. The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026); thepointsparty.com/credit-cards/issuer/chase (secondary)",
   "checked": "2026-11-23",
   "has": {
    "status": true
   },
   "hasWords": {
    "status": "IHG One Rewards Silver Elite. Gold Elite after $20,000 in purchases in a year"
   },
   "unique": [
    {
     "label": "Fourth night",
     "words": "Book 4 nights in a row with points and the fourth night costs no points"
    },
    {
     "label": "After spending",
     "words": "10,000 points after $10,000 in purchases in a year"
    },
    {
     "label": "Buying points",
     "words": "20% off when you buy IHG points with the card"
    },
    {
     "label": "Note",
     "words": "The library line names groceries at 3x. Chase names utilities and streaming, not groceries. The foreign fee was not shown for this card by the search"
    }
   ]
  },
  {
   "id": "IHG One Rewards Premier Select",
   "bank": "Chase",
   "n": "IHG One Rewards Premier Select",
   "network": "Mastercard",
   "fee": 350,
   "amt": 200000,
   "unit": "ihg",
   "spend": 5000,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 3,
    "rates": [
     {
      "cat": "hotel",
      "x": 12
     },
     {
      "cat": "dining",
      "x": 6
     },
     {
      "cat": "travel",
      "x": 6
     }
    ],
    "picks": [],
    "words": "12x IHG hotels, 6x dining and other travel (rideshare counts), 3x other"
   },
   "credits": [
    {
     "name": "IHG food and drink rewards",
     "value": 300,
     "words": "Up to $300 a year at IHG hotels"
    },
    {
     "name": "Airline credit",
     "value": 200,
     "words": "Up to $200 a year"
    },
    {
     "name": "United TravelBank cash",
     "value": 50,
     "words": "Up to $50"
    },
    {
     "name": "Global Entry or TSA PreCheck",
     "value": 30,
     "words": "Up to $120 every 4 years ($30 a year spread)"
    }
   ],
   "source": "The card: Search results that quote creditcards.chase.com/travel-credit-cards/ihg-rewards-club/premier-select, ihg.com/onerewards card page and media.chase.com/news/ihg-premier-select-card-portfolio-updates (issuer and hotel), nerdwallet.com and upgradedpoints.com reviews. The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026); financebuzz.com/chase-credit-cards (Nov 2026) (secondary)",
   "checked": "2026-11-23",
   "has": {
    "status": true,
    "night": true,
    "trusted": true
   },
   "hasWords": {
    "status": "IHG One Rewards Platinum Elite",
    "night": "One free night each card year, up to 60,000 points (you can add points)",
    "trusted": "Up to $120 every 4 years for Global Entry, TSA PreCheck or NEXUS"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "200,000 points, limited time"
    },
    {
     "label": "Second free night",
     "words": "After $40,000 in purchases in a calendar year"
    },
    {
     "label": "Toward status",
     "words": "20 Elite Night Credits at the start of each year, and more with spending"
    }
   ]
  },
  {
   "id": "IHG One Rewards Business",
   "bank": "Chase",
   "n": "IHG One Rewards Business",
   "network": "Mastercard",
   "fee": 200,
   "amt": 190000,
   "unit": "ihg",
   "spend": 5000,
   "months": 3,
   "min": "good",
   "biz": 1,
   "earn": {
    "base": 3,
    "rates": [
     {
      "cat": "hotel",
      "x": 10
     },
     {
      "cat": "dining",
      "x": 5
     },
     {
      "cat": "gas",
      "x": 5
     }
    ],
    "picks": [],
    "words": "10x IHG hotels; 5x gas, restaurants, social media and search ads; 5x travel and office supply stores through Dec 31, 2026 (then 5x only on flights booked direct and car rentals); 3x other"
   },
   "credits": [
    {
     "name": "Instacart credit",
     "value": 120,
     "words": "Up to $120 a calendar year, through Dec 31, 2027"
    },
    {
     "name": "Global Entry or TSA PreCheck",
     "value": 30,
     "words": "Up to $120 every 4 years ($30 a year spread)"
    }
   ],
   "source": "The card: Search results that quote creditcards.chase.com/business-credit-cards/IHG/business-premier and chase.com/business/credit-cards/ihg/business (issuer), awardwallet.com review. The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026); thepointsparty.com/credit-cards/issuer/chase (secondary)",
   "checked": "2026-11-23",
   "has": {
    "noForeignFee": true,
    "status": true,
    "night": true,
    "trusted": true
   },
   "hasWords": {
    "noForeignFee": "No foreign transaction fee",
    "status": "IHG One Rewards Platinum Elite",
    "night": "One free night each card year",
    "trusted": "Up to $120 every 4 years for Global Entry, TSA PreCheck or NEXUS"
   },
   "unique": [
    {
     "label": "Flight credit",
     "words": "$100 back on a flight of $250 or more booked with the airline, through Dec 31, 2027"
    },
    {
     "label": "Note",
     "words": "Travel is left out of the rates because 5x on all travel ends Dec 31, 2026. This card was the IHG One Rewards Premier Business card before"
    }
   ]
  },
  {
   "id": "World of Hyatt Business",
   "bank": "Chase",
   "n": "World of Hyatt Business",
   "network": "Visa",
   "fee": 199,
   "amt": 70000,
   "unit": "hyatt",
   "spend": 7000,
   "months": 3,
   "min": "good",
   "biz": 1,
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "hotel",
      "x": 4
     }
    ],
    "picks": [
     {
      "x": 2,
      "count": 3,
      "from": [
       "dining",
       "airline",
       "transit",
       "gas",
       "phone"
      ]
     }
    ],
    "words": "4x Hyatt, 2x in your top three categories each quarter, 2x fitness clubs and gyms, 1x other"
   },
   "credits": [
    {
     "name": "Hyatt credit",
     "value": 100,
     "words": "$50 back on a Hyatt purchase of $50 or more, up to 2 times each card year"
    }
   ],
   "source": "The card: Search results that quote creditcards.chase.com/business-credit-cards/world-of-hyatt/hyatt-business-card and chase.com world-hyatt-business pages (issuer), nerdwallet.com and upgradedpoints.com reviews. The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026); thepointsparty.com/credit-cards/issuer/chase (secondary)",
   "checked": "2026-11-23",
   "has": {
    "noForeignFee": true,
    "status": true,
    "rental": true,
    "tripCancel": true,
    "purchase": true,
    "warranty": true
   },
   "hasWords": {
    "noForeignFee": "No foreign transaction fee",
    "status": "World of Hyatt Discoverist, and you can give it to up to 5 employees",
    "rental": "Primary when you rent for business",
    "tripCancel": "Up to $1,500 a person and $6,000 a trip",
    "purchase": "Purchase protection",
    "warranty": "Extended warranty protection"
   },
   "unique": [
    {
     "label": "Where the sources differ",
     "words": "Another site shows 60,000 points"
    },
    {
     "label": "Points back",
     "words": "10% of redeemed points back after $50,000 in purchases in a calendar year"
    },
    {
     "label": "Note",
     "words": "The card picks the top three for you from eight categories. Car rentals, shipping and ads are also on that list but have no category here. The list of eight is general knowledge, not quoted by the search"
    }
   ]
  },
  {
   "id": "Aeroplan",
   "bank": "Chase",
   "n": "Aeroplan",
   "network": "Mastercard",
   "fee": 195,
   "amt": 75000,
   "unit": "aeroplan",
   "spend": 4000,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "airline",
      "x": 3
     },
     {
      "cat": "travel",
      "x": 3
     },
     {
      "cat": "dining",
      "x": 2
     },
     {
      "cat": "groceries",
      "x": 2
     },
     {
      "cat": "gas",
      "x": 2
     }
    ],
    "picks": [],
    "words": "3x Air Canada and travel; 2x dining, groceries and gas (dining and groceries earn 3x through Dec 31, 2026); 1x other"
   },
   "credits": [
    {
     "name": "Air Canada credit",
     "value": 100,
     "words": "Up to $100 a year, as two $50 credits (January and July)"
    },
    {
     "name": "Global Entry or TSA PreCheck",
     "value": 30,
     "words": "Up to $120 every 4 years ($30 a year spread)"
    }
   ],
   "source": "The card: Search results that quote media.chase.com/news/the-chase-air-canada-aeroplan-credit-card-refresh, creditcards.chase.com/travel-credit-cards/aircanada/aeroplan and aircanada.com (issuer and airline), thepointsguy.com and awardwallet.com. The network is general knowledge, not quoted by the search. The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026); thepointsparty.com/credit-cards/issuer/chase (secondary)",
   "checked": "2026-11-23",
   "has": {
    "noForeignFee": true,
    "status": true,
    "bag": true,
    "trusted": true
   },
   "hasWords": {
    "noForeignFee": "No foreign transaction fee",
    "status": "Aeroplan 25K status while you hold the card",
    "bag": "A free checked bag on Air Canada comes with the 25K status",
    "trusted": "Up to $120 every 4 years for Global Entry, TSA PreCheck or NEXUS"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "75,000 points, plus 40,000 more after $20,000 in the first 12 months"
    },
    {
     "label": "Where the sources differ",
     "words": "One site's headline says up to 80,000"
    },
    {
     "label": "Flight rewards",
     "words": "At least 15% fewer points on Air Canada flight rewards"
    },
    {
     "label": "Note",
     "words": "Changed Sep 10, 2026: now named Chase Air Canada Aeroplan Credit Card. Dining and groceries are set at the 2x rate that starts Jan 1, 2027. One Chase paper says Air Canada purchases also go to 2x after 2026; the news page says 3x"
    }
   ]
  },
  {
   "id": "British Airways Visa Signature",
   "bank": "Chase",
   "n": "British Airways Visa Signature",
   "network": "Visa",
   "fee": 95,
   "amt": 75000,
   "unit": "avios",
   "spend": 5000,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "airline",
      "x": 3
     },
     {
      "cat": "hotel",
      "x": 2
     }
    ],
    "picks": [],
    "words": "3 Avios on British Airways, Aer Lingus, Iberia and LEVEL; 2 on hotels booked direct; 1 other"
   },
   "credits": [],
   "source": "The card: Search results that quote creditcards.chase.com/travel-credit-cards/avios/british-airways and britishairways.com credit card page (issuer and airline). The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026); financebuzz.com/chase-credit-cards (Nov 2026) (secondary)",
   "checked": "2026-11-23",
   "has": {
    "noForeignFee": true
   },
   "hasWords": {
    "noForeignFee": "No foreign transaction fee"
   },
   "unique": [
    {
     "label": "Where the sources differ",
     "words": "Another site shows 90,000 Avios"
    },
    {
     "label": "Travel Together Ticket",
     "words": "After $30,000 in purchases in a calendar year: a companion on a reward flight for no more Avios, or half the Avios when you fly alone. Good for two years"
    },
    {
     "label": "Flight discount",
     "words": "10% off British Airways flights booked through the card link on ba.com"
    }
   ]
  },
  {
   "id": "Iberia Visa Signature",
   "bank": "Chase",
   "n": "Iberia Visa Signature",
   "network": "Visa",
   "fee": 95,
   "amt": 75000,
   "unit": "avios",
   "spend": 5000,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "airline",
      "x": 3
     },
     {
      "cat": "hotel",
      "x": 2
     }
    ],
    "picks": [],
    "words": "3 Avios on Iberia, British Airways, Aer Lingus and LEVEL; 2 on hotels booked direct; 1 other"
   },
   "credits": [],
   "source": "The card: Search results that quote creditcards.chase.com/travel-credit-cards/avios/iberia (issuer). The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026) (secondary)",
   "checked": "2026-11-23",
   "has": {
    "noForeignFee": true
   },
   "hasWords": {
    "noForeignFee": "No foreign transaction fee"
   },
   "unique": [
    {
     "label": "Discount voucher",
     "words": "After $30,000 in purchases in a calendar year: $1,000 off two tickets on the same Iberia flight"
    },
    {
     "label": "Flight discount",
     "words": "10% off Iberia flights"
    }
   ]
  },
  {
   "id": "Aer Lingus Visa Signature",
   "bank": "Chase",
   "n": "Aer Lingus Visa Signature",
   "network": "Visa",
   "fee": 95,
   "amt": 75000,
   "unit": "avios",
   "spend": 5000,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "airline",
      "x": 3
     },
     {
      "cat": "hotel",
      "x": 2
     }
    ],
    "picks": [],
    "words": "3 Avios on Aer Lingus, British Airways, Iberia and LEVEL; 2 on hotels booked direct; 1 other"
   },
   "credits": [],
   "source": "The card: Search results that quote creditcards.chase.com/travel-credit-cards/avios/aer-lingus (issuer). The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026) (secondary)",
   "checked": "2026-11-23",
   "has": {
    "noForeignFee": true
   },
   "hasWords": {
    "noForeignFee": "No foreign transaction fee"
   },
   "unique": [
    {
     "label": "Companion Ticket",
     "words": "After $30,000 in purchases in a calendar year: one economy companion ticket"
    },
    {
     "label": "Boarding",
     "words": "Priority boarding on Aer Lingus flights between the US and Ireland"
    }
   ]
  },
  {
   "id": "Disney Premier Visa",
   "bank": "Chase",
   "n": "Disney Premier Visa",
   "network": "Visa",
   "fee": 49,
   "amt": 300,
   "unit": "disney",
   "spend": 500,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "gas",
      "x": 2
     },
     {
      "cat": "groceries",
      "x": 2
     },
     {
      "cat": "dining",
      "x": 2
     },
     {
      "cat": "store",
      "x": 2
     }
    ],
    "picks": [],
    "words": "5% Disney+, Hulu and ESPN streaming paid direct; 2% gas, groceries, restaurants and most US Disney locations; 1% other"
   },
   "credits": [],
   "source": "The card: Search results that quote creditcards.chase.com/rewards-credit-cards/disney/premier and disneyrewards.com (issuer and brand). The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026) (secondary)",
   "checked": "2026-11-23",
   "has": {},
   "hasWords": {},
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "$200 Disney gift card plus a $100 statement credit"
    },
    {
     "label": "What it earns",
     "words": "Disney Rewards Dollars, to use at Disney or as a credit toward airline tickets"
    },
    {
     "label": "Streaming",
     "words": "5% only on DisneyPlus.com, Hulu.com and Stream.ESPN.com, so it is not set as a streaming rate"
    },
    {
     "label": "Disney trips",
     "words": "0% promotional rate for 6 months on select Disney vacation packages"
    },
    {
     "label": "Disney discounts",
     "words": "10% off select merchandise and dining at Disneyland and Walt Disney World; 15% off select guided tours"
    }
   ]
  },
  {
   "id": "Disney Inspire Visa",
   "bank": "Chase",
   "n": "Disney Inspire Visa",
   "network": "Visa",
   "fee": 149,
   "amt": 500,
   "unit": "disney",
   "spend": 1000,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "gas",
      "x": 3
     },
     {
      "cat": "store",
      "x": 3
     },
     {
      "cat": "groceries",
      "x": 2
     },
     {
      "cat": "dining",
      "x": 2
     }
    ],
    "picks": [],
    "words": "10% Disney+, Hulu and ESPN streaming paid direct; 3% gas and most US Disney locations; 2% groceries and restaurants; 1% other"
   },
   "credits": [
    {
     "name": "Streaming credit",
     "value": 120,
     "words": "$10 a month on Disney streaming charges after you enroll each year"
    },
    {
     "name": "Theme park ticket credit",
     "value": 100,
     "words": "$100 back after $200 on US Disney theme park tickets in a card year"
    }
   ],
   "source": "The card: Search results that quote creditcards.chase.com/rewards-credit-cards/disney/inspire, media.chase.com launch news and disneyrewards.com (issuer and brand). The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026) (secondary)",
   "checked": "2026-11-23",
   "has": {},
   "hasWords": {},
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "$300 Disney gift card on approval plus a $200 statement credit"
    },
    {
     "label": "What it earns",
     "words": "Disney Rewards Dollars, to use at Disney"
    },
    {
     "label": "Streaming",
     "words": "10% only on DisneyPlus.com, Hulu.com and Stream.ESPN.com, so it is not set as a streaming rate"
    },
    {
     "label": "Resort bonus",
     "words": "200 Disney Rewards Dollars after $2,000 on US Disney resort stays and Disney Cruise Line in a card year"
    }
   ]
  },
  {
   "id": "Instacart Mastercard",
   "bank": "Chase",
   "n": "Instacart Mastercard",
   "network": "Mastercard",
   "fee": 0,
   "amt": 50,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "store",
      "x": 5,
      "cap": 6000,
      "per": "year",
      "then": 1
     },
     {
      "cat": "travelPortal",
      "x": 5
     },
     {
      "cat": "dining",
      "x": 2
     },
     {
      "cat": "gas",
      "x": 2
     },
     {
      "cat": "streaming",
      "x": 2
     }
    ],
    "picks": [],
    "words": "5% Instacart on the first $6,000 a year, 5% Chase Travel, 2% restaurants, gas and select streaming, 1% other"
   },
   "credits": [],
   "source": "The card: Search results that quote instacart.com/InstacartMastercard, creditcards.chase.com/cash-back-credit-cards/instacart and chase.com/instacart/rewardsagreement (issuer and brand). The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026) (secondary)",
   "checked": "2026-11-23",
   "has": {
    "noForeignFee": true
   },
   "hasWords": {
    "noForeignFee": "No foreign transaction fee"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "$50 Instacart credit on approval"
    },
    {
     "label": "Card level",
     "words": "World Elite Mastercard"
    }
   ]
  },
  {
   "id": "Slate",
   "bank": "Chase",
   "n": "Slate",
   "network": "Visa",
   "fee": 0,
   "amt": 0,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 0,
    "rates": [],
    "picks": [],
    "words": "No rewards"
   },
   "credits": [],
   "source": "The card: Search results that quote creditcards.chase.com/balance-transfer-credit-cards/slate (issuer), cnbc.com/select and creditkarma.com. The network is general knowledge, not quoted by the search. The offer: yourbestcards.com/chase-credit-cards (page dated Oct 2026); financebuzz.com/chase-credit-cards (Nov 2026) (secondary)",
   "checked": "2026-11-23",
   "has": {
    "intro0": true,
    "purchase": true,
    "warranty": true
   },
   "hasWords": {
    "intro0": "0% for 21 months on purchases and balance transfers",
    "purchase": "Purchase protection",
    "warranty": "Extended warranty protection"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "No bonus. 0% intro rate for 21 months on purchases and balance transfers"
    },
    {
     "label": "Balance transfer fee",
     "words": "$5 or 5% of each transfer, the larger one"
    }
   ]
  },
  {
   "id": "amex-platinum",
   "bank": "American Express",
   "n": "Platinum Card",
   "network": "American Express",
   "fee": 895,
   "amt": 175000,
   "unit": "mr",
   "spend": 12000,
   "months": 6,
   "min": "excellent",
   "upTo": 1,
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "airline",
      "x": 5,
      "cap": 500000,
      "per": "year",
      "then": 1
     },
     {
      "cat": "hotelPortal",
      "x": 5
     }
    ],
    "picks": [],
    "words": "5x flights booked direct or with Amex Travel (up to $500,000 a year), 5x prepaid hotels on Amex Travel, 1x everything else"
   },
   "credits": [
    {
     "name": "Fine Hotels + Resorts or Hotel Collection",
     "value": 600,
     "words": "Up to $300 each half year on prepaid Amex Travel stays"
    },
    {
     "name": "Resy restaurants",
     "value": 400,
     "words": "Up to $100 a quarter at US Resy restaurants; enroll"
    },
    {
     "name": "Digital entertainment",
     "value": 300,
     "words": "Up to $25 a month on Disney+, Hulu, ESPN+, Peacock, NYT, YouTube and others; enroll"
    },
    {
     "name": "Uber Cash",
     "value": 200,
     "words": "$15 a month plus a December bonus"
    },
    {
     "name": "Uber One membership",
     "value": 120,
     "words": "Up to $120 a year on an Uber One membership"
    },
    {
     "name": "Airline fees",
     "value": 200,
     "words": "Up to $200 a year in incidental fees on one chosen airline; enroll"
    },
    {
     "name": "lululemon",
     "value": 300,
     "words": "Up to $75 a quarter; enroll"
    },
    {
     "name": "Equinox",
     "value": 300,
     "words": "Up to $300 a year; enroll"
    },
    {
     "name": "CLEAR+",
     "value": 209,
     "words": "Up to the yearly CLEAR+ fee"
    },
    {
     "name": "Walmart+",
     "value": 155,
     "words": "Up to $12.95 a month on a Walmart+ membership"
    },
    {
     "name": "Oura Ring",
     "value": 200,
     "words": "Up to $200 a year at ouraring.com; enroll"
    },
    {
     "name": "Global Entry or TSA PreCheck",
     "value": 30,
     "words": "Up to $120 every 4 years"
    }
   ],
   "source": "The card: https://www.nerdwallet.com/reviews/credit-cards/american-express-platinum (secondary). The offer: financebuzz.com/american-express-credit-cards (Nov 2026); doctorofcredit.com best current sign-up bonuses (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "rental": true,
    "tripCancel": true,
    "tripDelay": true,
    "cellPhone": true,
    "purchase": true,
    "warranty": true,
    "lounge": true,
    "noForeignFee": true,
    "trusted": true
   },
   "hasWords": {
    "rental": "Car rental loss and damage insurance, secondary, when the rental is paid with the card",
    "tripCancel": "Trip cancellation and interruption, up to $10,000 a trip",
    "tripDelay": "Trip delay over 6 hours, up to $500",
    "cellPhone": "Cell phone protection: up to $800 a claim, $50 deductible, 2 claims a year, when the phone bill is paid with the card",
    "purchase": "Purchase protection: theft or accidental damage within 90 days, up to $1,000 an item",
    "warranty": "Extended warranty: one more year on US manufacturer warranties of 5 years or less",
    "lounge": "Centurion Lounges, Priority Pass, Delta Sky Club when flying Delta (10 visits a year) and more",
    "trusted": "Up to $120 every 4 years"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "As high as 175,000 Membership Rewards points"
    },
    {
     "label": "What it earns",
     "words": "Points"
    },
    {
     "label": "Paying it off",
     "words": "A charge card: pay in full, or Pay Over Time at its own APR"
    },
    {
     "label": "Note",
     "words": "Refreshed Sep 2025; fee $895"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "trip protection limits and the CLEAR+ amount ($209 to $219 across sources)"
    }
   ]
  },
  {
   "id": "amex-gold",
   "bank": "American Express",
   "n": "Gold Card",
   "network": "American Express",
   "fee": 325,
   "amt": 100000,
   "unit": "mr",
   "spend": 8000,
   "months": 6,
   "min": "good",
   "upTo": 1,
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "dining",
      "x": 4,
      "cap": 50000,
      "per": "year",
      "then": 1
     },
     {
      "cat": "groceries",
      "x": 4,
      "cap": 25000,
      "per": "year",
      "then": 1
     },
     {
      "cat": "airline",
      "x": 3
     },
     {
      "cat": "hotelPortal",
      "x": 5
     }
    ],
    "picks": [],
    "words": "4x restaurants and US takeout (up to $50,000 a year), 4x US supermarkets (up to $25,000 a year), 5x prepaid hotels and 3x flights on Amex Travel or direct, 1x everything else"
   },
   "credits": [
    {
     "name": "Dining credit",
     "value": 120,
     "words": "Up to $10 a month at Grubhub, Five Guys, Cheesecake Factory, Buffalo Wild Wings, Wonder; enroll"
    },
    {
     "name": "Uber Cash",
     "value": 120,
     "words": "$10 a month on Uber rides or Uber Eats in the US"
    },
    {
     "name": "Resy restaurants",
     "value": 100,
     "words": "Up to $50 Jan to Jun and $50 Jul to Dec; enroll"
    },
    {
     "name": "Dunkin'",
     "value": 84,
     "words": "Up to $7 a month at US Dunkin'; enroll"
    },
    {
     "name": "Hotel Collection",
     "value": 0,
     "words": "Up to $100 of on-property charges on a 2-night Amex Travel stay; counted only if used"
    }
   ],
   "source": "The card: https://www.americanexpress.com/en-us/credit-cards/credit-intel/amex-gold-vs-blue-cash-preferred/ (issuer). The offer: financebuzz.com/american-express-credit-cards (Nov 2026); nerdwallet.com best bonus offers (Nov 2026); cnn.com/cnn-underscored best Amex cards (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "rental": true,
    "tripDelay": true,
    "baggage": true,
    "purchase": true,
    "warranty": true,
    "noForeignFee": true
   },
   "hasWords": {
    "rental": "Car rental loss and damage insurance, secondary, when the rental is paid with the card",
    "tripDelay": "Trip delay over 12 hours, up to $300",
    "baggage": "Baggage insurance",
    "purchase": "Purchase protection: theft or accidental damage within 90 days, up to $1,000 an item",
    "warranty": "Extended warranty: one more year on US manufacturer warranties of 5 years or less"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "As high as 100,000 Membership Rewards points"
    },
    {
     "label": "What it earns",
     "words": "Points"
    },
    {
     "label": "Paying it off",
     "words": "Pay in full, or Pay Over Time at its own APR"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "protections (from the Gold benefits as known in mid 2026)"
    }
   ]
  },
  {
   "id": "amex-green",
   "bank": "American Express",
   "n": "Green Card",
   "network": "American Express",
   "fee": 150,
   "amt": null,
   "unit": "mr",
   "spend": 3000,
   "months": 6,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "travel",
      "x": 3
     },
     {
      "cat": "transit",
      "x": 3
     },
     {
      "cat": "dining",
      "x": 3
     }
    ],
    "picks": [],
    "words": "3x travel, transit and restaurants, 1x everything else"
   },
   "credits": [
    {
     "name": "CLEAR+",
     "value": 209,
     "words": "Up to the yearly CLEAR+ fee"
    }
   ],
   "source": "The card: https://www.americanexpress.com/us/credit-cards/card/green/ (unverified). The offer: financebuzz.com/american-express-credit-cards (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "rental": true,
    "tripDelay": true,
    "baggage": true,
    "purchase": true,
    "warranty": true,
    "noForeignFee": true
   },
   "hasWords": {
    "rental": "Car rental loss and damage insurance, secondary, when the rental is paid with the card",
    "tripDelay": "Trip delay over 12 hours, up to $300",
    "baggage": "Baggage insurance",
    "purchase": "Purchase protection: theft or accidental damage within 90 days, up to $1,000 an item",
    "warranty": "Extended warranty: one more year on US manufacturer warranties of 5 years or less"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "40,000 points on one site, which also says the card no longer takes new applications"
    },
    {
     "label": "Why no dollar value",
     "words": "One site says it no longer takes new applications, so it is not counted."
    },
    {
     "label": "What it earns",
     "words": "Points"
    },
    {
     "label": "Paying it off",
     "words": "Pay in full, or Pay Over Time at its own APR"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "all of it: fee, rates and credits as known in mid 2026"
    }
   ]
  },
  {
   "id": "amex-blue-cash-preferred",
   "bank": "American Express",
   "n": "Blue Cash Preferred",
   "network": "American Express",
   "fee": 95,
   "amt": 300,
   "unit": "cash",
   "spend": 3000,
   "months": 6,
   "min": "good",
   "fee1": 0,
   "upTo": 1,
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "groceries",
      "x": 6,
      "cap": 6000,
      "per": "year",
      "then": 1
     },
     {
      "cat": "streaming",
      "x": 6
     },
     {
      "cat": "gas",
      "x": 3
     },
     {
      "cat": "transit",
      "x": 3
     }
    ],
    "picks": [],
    "words": "6% US supermarkets (up to $6,000 a year), 6% select US streaming, 3% US gas and transit, 1% everything else"
   },
   "credits": [
    {
     "name": "Disney streaming credit",
     "value": 120,
     "words": "Up to $10 a month on Disney+, Hulu or ESPN+; enroll"
    }
   ],
   "source": "The card: https://www.americanexpress.com/en-us/credit-cards/credit-intel/amex-gold-vs-blue-cash-preferred/ (issuer). The offer: financebuzz.com/american-express-credit-cards (Nov 2026); nerdwallet.com best bonus offers (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "rental": true,
    "purchase": true,
    "warranty": true,
    "intro0": true
   },
   "hasWords": {
    "rental": "Car rental loss and damage insurance, secondary, when the rental is paid with the card",
    "purchase": "Purchase protection: theft or accidental damage within 90 days, up to $1,000 an item",
    "warranty": "Extended warranty: one more year on US manufacturer warranties of 5 years or less",
    "intro0": "12 months on purchases, 12 months on balance transfers"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "As high as $300 cash back. $0 fee the first year"
    },
    {
     "label": "Where the sources differ",
     "words": "Another site shows $250"
    },
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Foreign transaction fee",
     "words": "2.7% of each purchase abroad"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "20.24% to 29.24% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Note",
     "words": "$0 the first year"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "APR range, intro APR and foreign fee"
    }
   ]
  },
  {
   "id": "amex-blue-cash-everyday",
   "bank": "American Express",
   "n": "Blue Cash Everyday",
   "network": "American Express",
   "fee": 0,
   "amt": 200,
   "unit": "cash",
   "spend": 2000,
   "months": 6,
   "min": "good",
   "upTo": 1,
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "groceries",
      "x": 3,
      "cap": 6000,
      "per": "year",
      "then": 1
     },
     {
      "cat": "gas",
      "x": 3,
      "cap": 6000,
      "per": "year",
      "then": 1
     },
     {
      "cat": "online",
      "x": 3,
      "cap": 6000,
      "per": "year",
      "then": 1
     }
    ],
    "picks": [],
    "words": "3% US supermarkets, US online retail and US gas (each up to $6,000 a year), 1% everything else"
   },
   "credits": [
    {
     "name": "Disney streaming credit",
     "value": 84,
     "words": "Up to $7 a month on the Disney bundle; enroll"
    },
    {
     "name": "Home Chef credit",
     "value": 0,
     "words": "Up to $15 a month at Home Chef; counted only if used"
    }
   ],
   "source": "The card: https://www.americanexpress.com/us/credit-cards/card/blue-cash-everyday/ (unverified). The offer: financebuzz.com/american-express-credit-cards (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "rental": true,
    "purchase": true,
    "warranty": true,
    "intro0": true
   },
   "hasWords": {
    "rental": "Car rental loss and damage insurance, secondary, when the rental is paid with the card",
    "purchase": "Purchase protection: theft or accidental damage within 90 days, up to $1,000 an item",
    "warranty": "Extended warranty: one more year on US manufacturer warranties of 5 years or less",
    "intro0": "15 months on purchases, 15 months on balance transfers"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "As high as $200 cash back"
    },
    {
     "label": "Where the sources differ",
     "words": "Another site shows $250"
    },
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Foreign transaction fee",
     "words": "2.7% of each purchase abroad"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "20.24% to 29.24% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "all of it, as known in mid 2026"
    }
   ]
  },
  {
   "id": "amex-delta-gold",
   "bank": "American Express",
   "n": "Delta SkyMiles Gold",
   "network": "American Express",
   "fee": 150,
   "amt": 80000,
   "unit": "delta",
   "spend": 2000,
   "months": 6,
   "min": "good",
   "fee1": 0,
   "upTo": 1,
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "airline",
      "x": 2
     },
     {
      "cat": "dining",
      "x": 2
     },
     {
      "cat": "groceries",
      "x": 2
     }
    ],
    "picks": [],
    "words": "2x Delta, restaurants and US supermarkets, 1x everything else"
   },
   "credits": [
    {
     "name": "First checked bag free",
     "value": 140,
     "words": "For you and up to 8 on one reservation; about $140 a year on two round trips"
    },
    {
     "name": "Delta flight credit",
     "value": 0,
     "words": "$200 after $10,000 spent in a year; counted only if reached"
    },
    {
     "name": "Delta Stays credit",
     "value": 100,
     "words": "Up to $100 a year on prepaid Delta Stays hotels"
    }
   ],
   "source": "The card: https://www.americanexpress.com/us/credit-cards/card/delta-skymiles-gold-american-express-card/ (unverified). The offer: awardwallet.com Amex offer history (Nov 2026); cnn.com/cnn-underscored best Amex cards (Nov 2026); financebuzz.com/american-express-credit-cards (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "rental": true,
    "baggage": true,
    "purchase": true,
    "warranty": true,
    "noForeignFee": true,
    "bag": true
   },
   "hasWords": {
    "rental": "Car rental loss and damage insurance, secondary, when the rental is paid with the card",
    "baggage": "Baggage insurance",
    "purchase": "Purchase protection: theft or accidental damage within 90 days, up to $1,000 an item",
    "warranty": "Extended warranty: one more year on US manufacturer warranties of 5 years or less",
    "bag": "For you and up to 8 on one reservation; about $140 a year on two round trips"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "As high as 80,000 miles. $0 fee the first year"
    },
    {
     "label": "What it earns",
     "words": "Miles"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "20.24% to 29.24% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Note",
     "words": "$0 the first year"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "all of it, as known in mid 2026"
    }
   ]
  },
  {
   "id": "amex-hilton-honors",
   "bank": "American Express",
   "n": "Hilton Honors",
   "network": "American Express",
   "fee": 0,
   "amt": null,
   "unit": "hilton",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 3,
    "rates": [
     {
      "cat": "hotel",
      "x": 7
     },
     {
      "cat": "dining",
      "x": 5
     },
     {
      "cat": "groceries",
      "x": 5
     },
     {
      "cat": "gas",
      "x": 5
     }
    ],
    "picks": [],
    "words": "7x Hilton, 5x restaurants, US supermarkets and US gas, 3x everything else"
   },
   "credits": [],
   "source": "The card: https://www.americanexpress.com/us/credit-cards/card/hilton-honors/ (unverified). The offer: financebuzz.com/american-express-credit-cards (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "rental": true,
    "purchase": true,
    "warranty": true,
    "noForeignFee": true
   },
   "hasWords": {
    "rental": "Car rental loss and damage insurance, secondary, when the rental is paid with the card",
    "purchase": "Purchase protection: theft or accidental damage within 90 days, up to $1,000 an item",
    "warranty": "Extended warranty: one more year on US manufacturer warranties of 5 years or less"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "None found today (an older page shows 100,000 points)"
    },
    {
     "label": "Why no dollar value",
     "words": "No welcome offer was found for it in today's sources."
    },
    {
     "label": "What it earns",
     "words": "Points"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "20.24% to 29.24% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "all of it, as known in mid 2026"
    }
   ]
  },
  {
   "id": "capone-venture-x",
   "bank": "Capital One",
   "n": "Venture X",
   "network": "Visa",
   "fee": 395,
   "amt": 75000,
   "unit": "c1",
   "spend": 4000,
   "months": 3,
   "min": "excellent",
   "earn": {
    "base": 2,
    "rates": [
     {
      "cat": "travelPortal",
      "x": 10
     }
    ],
    "picks": [],
    "words": "10x hotels and rental cars and 5x flights on Capital One Travel, 2x everything else"
   },
   "credits": [
    {
     "name": "Capital One Travel credit",
     "value": 300,
     "words": "Up to $300 a card year on Capital One Travel bookings"
    },
    {
     "name": "10,000 anniversary miles",
     "value": 100,
     "words": "Worth $100 against travel each card anniversary"
    },
    {
     "name": "Global Entry or TSA PreCheck",
     "value": 30,
     "words": "Up to $120 every 4 years"
    }
   ],
   "source": "The card: https://www.capitalone.com/credit-cards/compare (issuer). The offer: capitalone.com sign-up bonus page (Oct 2026); upgradedpoints.com Venture X offer history; nerdwallet.com best bonus offers (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "transfer": true,
    "rental": true,
    "tripCancel": true,
    "tripDelay": true,
    "baggage": true,
    "cellPhone": true,
    "purchase": true,
    "warranty": true,
    "lounge": true,
    "noForeignFee": true,
    "trusted": true
   },
   "hasWords": {
    "transfer": "Transfer partners can be worth more than the floor value",
    "rental": "Primary rental car coverage up to $75,000",
    "tripCancel": "Trip cancellation and interruption",
    "tripDelay": "Trip delay",
    "baggage": "Lost luggage",
    "cellPhone": "Cell phone protection: up to $800 a claim, $50 deductible, 2 claims a year, when the phone bill is paid with the card",
    "purchase": "Purchase protection: 90 days, up to $10,000 a claim",
    "warranty": "Extended warranty: one more year on warranties of 3 years or less",
    "lounge": "Priority Pass and Capital One Lounges (authorized users pay $125 a year since Feb 1, 2026)",
    "trusted": "Up to $120 every 4 years"
   },
   "unique": [
    {
     "label": "What it earns",
     "words": "Miles"
    },
    {
     "label": "About the points",
     "words": "Miles are worth 1 cent against travel; transfer partners can be worth more"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "19.99% to 29.24% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "APR range; benefit limits (AwardWallet, Jun 2026)"
    }
   ]
  },
  {
   "id": "capone-venture",
   "bank": "Capital One",
   "n": "Venture",
   "network": "Visa",
   "fee": 95,
   "amt": 75000,
   "unit": "c1",
   "spend": 4000,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 2,
    "rates": [
     {
      "cat": "travelPortal",
      "x": 5
     }
    ],
    "picks": [],
    "words": "5x hotels and rental cars on Capital One Travel, 2x everything else"
   },
   "credits": [
    {
     "name": "Global Entry or TSA PreCheck",
     "value": 30,
     "words": "Up to $120 every 4 years"
    }
   ],
   "source": "The card: https://www.capitalone.com/credit-cards/compare (issuer). The offer: creditkarma.com sign-up bonus cards (Nov 2026); nerdwallet.com best bonus offers (Nov 2026); doctorofcredit.com best current sign-up bonuses (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "rental": true,
    "tripDelay": true,
    "warranty": true,
    "noForeignFee": true,
    "trusted": true
   },
   "hasWords": {
    "rental": "Secondary collision damage waiver on rentals paid with the card (decline the counter coverage)",
    "tripDelay": "Travel accident insurance",
    "warranty": "Extended warranty",
    "trusted": "Up to $120 every 4 years"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "75,000 miles, plus $300 to use at Capital One Travel in the first year (limited time)"
    },
    {
     "label": "Where the sources differ",
     "words": "One site shows a $250 credit"
    },
    {
     "label": "What it earns",
     "words": "Miles"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "19.99% to 29.24% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "APR range; benefits"
    }
   ]
  },
  {
   "id": "capone-ventureone",
   "bank": "Capital One",
   "n": "VentureOne",
   "network": "Visa",
   "fee": 0,
   "amt": 20000,
   "unit": "c1",
   "spend": 500,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1.25,
    "rates": [
     {
      "cat": "travelPortal",
      "x": 5
     }
    ],
    "picks": [],
    "words": "5x hotels and rental cars on Capital One Travel, 1.25x everything else"
   },
   "credits": [],
   "source": "The card: https://www.capitalone.com/credit-cards/compare (issuer). The offer: bestmoney.com Capital One cards; bankrate.com Capital One cards",
   "checked": "2026-11-06",
   "has": {
    "rental": true,
    "warranty": true,
    "noForeignFee": true,
    "intro0": true
   },
   "hasWords": {
    "rental": "Secondary collision damage waiver on rentals paid with the card (decline the counter coverage)",
    "warranty": "Extended warranty",
    "intro0": "15 months on purchases, 15 months on balance transfers"
   },
   "unique": [
    {
     "label": "Where the sources differ",
     "words": "Another offer shows 40,000 miles after $1,000"
    },
    {
     "label": "What it earns",
     "words": "Miles"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "18.99% to 28.99% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "APR range; benefits"
    }
   ]
  },
  {
   "id": "capone-quicksilver",
   "bank": "Capital One",
   "n": "Quicksilver",
   "network": "Mastercard",
   "fee": 0,
   "amt": 200,
   "unit": "cash",
   "spend": 500,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1.5,
    "rates": [
     {
      "cat": "travelPortal",
      "x": 5
     }
    ],
    "picks": [],
    "words": "1.5% on everything, 5% hotels and rental cars on Capital One Travel"
   },
   "credits": [],
   "source": "The card: https://www.capitalone.com/credit-cards/compare (issuer). The offer: capitalone.com sign-up bonus page (Oct 2026)",
   "checked": "2026-11-06",
   "has": {
    "warranty": true,
    "noForeignFee": true,
    "intro0": true
   },
   "hasWords": {
    "warranty": "Extended warranty",
    "intro0": "15 months on purchases, 15 months on balance transfers"
   },
   "unique": [
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "18.99% to 28.99% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "APR range; benefits"
    }
   ]
  },
  {
   "id": "capone-savor",
   "bank": "Capital One",
   "n": "Savor",
   "network": "Mastercard",
   "fee": 0,
   "amt": 200,
   "unit": "cash",
   "spend": 500,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "groceries",
      "x": 3
     },
     {
      "cat": "dining",
      "x": 3
     },
     {
      "cat": "entertainment",
      "x": 3
     },
     {
      "cat": "streaming",
      "x": 3
     }
    ],
    "picks": [],
    "words": "3% groceries (not superstores), dining, entertainment and popular streaming, 1% everything else"
   },
   "credits": [],
   "source": "The card: https://www.capitalone.com/credit-cards/compare (issuer). The offer: capitalone.com sign-up bonus page (Oct 2026); nerdwallet.com best bonus offers (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "warranty": true,
    "noForeignFee": true,
    "intro0": true
   },
   "hasWords": {
    "warranty": "Extended warranty",
    "intro0": "12 months on purchases, 12 months on balance transfers"
   },
   "unique": [
    {
     "label": "Where the sources differ",
     "words": "Another site shows $250"
    },
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "18.99% to 28.99% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Note",
     "words": "Was SavorOne; $0 fee now"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "APR range"
    }
   ]
  },
  {
   "id": "capone-quicksilverone",
   "bank": "Capital One",
   "n": "QuicksilverOne",
   "network": "Mastercard",
   "fee": 39,
   "amt": null,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1.5,
    "rates": [],
    "picks": [],
    "words": "1.5% on everything"
   },
   "credits": [],
   "source": "The card: https://www.capitalone.com/credit-cards/compare (issuer). The offer: capitalone.com sign-up bonus page (Oct 2026)",
   "checked": "2026-11-06",
   "has": {
    "noForeignFee": true,
    "starter": true
   },
   "hasWords": {},
   "unique": [
    {
     "label": "Why no dollar value",
     "words": "No welcome offer was found for it in today's sources."
    },
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "29.74% to 29.74% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Note",
     "words": "For fair credit"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "APR"
    }
   ]
  },
  {
   "id": "capone-platinum",
   "bank": "Capital One",
   "n": "Platinum",
   "network": "Mastercard",
   "fee": 0,
   "amt": null,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 0,
    "rates": [],
    "picks": [],
    "words": "No rewards"
   },
   "credits": [],
   "source": "The card: https://www.capitalone.com/credit-cards/compare (issuer). The offer: capitalone.com sign-up bonus page (Oct 2026)",
   "checked": "2026-11-06",
   "has": {
    "noForeignFee": true,
    "starter": true
   },
   "hasWords": {},
   "unique": [
    {
     "label": "Why no dollar value",
     "words": "No welcome offer was found for it in today's sources."
    },
    {
     "label": "What it earns",
     "words": "None"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "29.74% to 29.74% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "APR"
    }
   ]
  },
  {
   "id": "capone-platinum-secured",
   "bank": "Capital One",
   "n": "Platinum Secured",
   "network": "Mastercard",
   "fee": 0,
   "amt": null,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 0,
    "rates": [],
    "picks": [],
    "words": "No rewards"
   },
   "credits": [],
   "source": "The card: https://www.capitalone.com/credit-cards/compare (issuer). The offer: capitalone.com sign-up bonus page (Oct 2026)",
   "checked": "2026-11-06",
   "has": {
    "noForeignFee": true,
    "secured": true
   },
   "hasWords": {
    "secured": "Refundable deposit of $49, $99 or $200"
   },
   "unique": [
    {
     "label": "Why no dollar value",
     "words": "No welcome offer was found for it in today's sources."
    },
    {
     "label": "What it earns",
     "words": "None"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "29.74% to 29.74% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "APR"
    }
   ]
  },
  {
   "id": "capone-quicksilver-secured",
   "bank": "Capital One",
   "n": "Quicksilver Secured",
   "network": "Mastercard",
   "fee": 0,
   "amt": null,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1.5,
    "rates": [],
    "picks": [],
    "words": "1.5% on everything"
   },
   "credits": [],
   "source": "The card: https://www.capitalone.com/credit-cards/compare (issuer). The offer: capitalone.com sign-up bonus page (Oct 2026)",
   "checked": "2026-11-06",
   "has": {
    "noForeignFee": true,
    "secured": true
   },
   "hasWords": {
    "secured": "Refundable deposit from $200"
   },
   "unique": [
    {
     "label": "Why no dollar value",
     "words": "No welcome offer was found for it in today's sources."
    },
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "29.74% to 29.74% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "APR"
    }
   ]
  },
  {
   "id": "capone-kohls",
   "bank": "Capital One",
   "n": "Kohl's Rewards Visa",
   "network": "Visa",
   "fee": 0,
   "amt": null,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "store",
      "x": 7.5
     },
     {
      "cat": "gas",
      "x": 3
     },
     {
      "cat": "groceries",
      "x": 2
     }
    ],
    "picks": [],
    "words": "7.5% at Kohl's, 3% gas, 2% groceries, 1% everything else"
   },
   "credits": [],
   "source": "The card: https://www.capitalone.com/credit-cards/compare (issuer). The offer: capitalone.com sign-up bonus page (Oct 2026)",
   "checked": "2026-11-06",
   "has": {
    "store": true
   },
   "hasWords": {
    "store": "Kohl's"
   },
   "unique": [
    {
     "label": "Why no dollar value",
     "words": "No welcome offer was found for it in today's sources."
    },
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Paying it off",
     "words": "Not on the issuer page; see the card terms"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "APR"
    }
   ]
  },
  {
   "id": "citi-double-cash",
   "bank": "Citi",
   "n": "Double Cash",
   "network": "Mastercard",
   "fee": 0,
   "amt": 200,
   "unit": "cash",
   "spend": 1500,
   "months": 6,
   "min": "good",
   "earn": {
    "base": 2,
    "rates": [
     {
      "cat": "travelPortal",
      "x": 5
     }
    ],
    "picks": [],
    "words": "2% on everything (1% when you buy, 1% when you pay), 5% hotels, car rentals and attractions on Citi Travel"
   },
   "credits": [],
   "source": "The card: https://www.mastercard.com/us/en/personal/find-a-card/credit-card/issuers/citi.html (issuer). The offer: wallethub.com Citi sign-up bonuses (Nov 2026); doctorofcredit.com best current sign-up bonuses (Nov 2026); bonusceiling.com Citi bonus rules, from Citi's own pages read 2026-11-02",
   "checked": "2026-11-06",
   "has": {
    "intro0": true
   },
   "hasWords": {
    "intro0": "18 months on balance transfers"
   },
   "unique": [
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Foreign transaction fee",
     "words": "3% of each purchase abroad"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "18.49% to 28.74% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Note",
     "words": "From the Mastercard page for Citi cards"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "foreign fee"
    }
   ]
  },
  {
   "id": "citi-custom-cash",
   "bank": "Citi",
   "n": "Custom Cash",
   "network": "Mastercard",
   "fee": 0,
   "amt": 200,
   "unit": "cash",
   "spend": 1500,
   "months": 6,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [],
    "picks": [
     {
      "x": 5,
      "count": 1,
      "from": [
       "dining",
       "groceries",
       "gas",
       "transit",
       "travel",
       "streaming",
       "drugstore",
       "home",
       "entertainment"
      ],
      "cap": 500,
      "per": "month",
      "then": 1
     }
    ],
    "words": "5% in your top spending category each billing cycle (up to $500), 1% everything else"
   },
   "credits": [],
   "source": "The card: https://www.citi.com/credit-cards/citi-custom-cash-credit-card (unverified). The offer: joingerald.com Citi card bonuses (2026); thepointsguy.com Citi welcome offers",
   "checked": "2026-11-06",
   "has": {
    "intro0": true
   },
   "hasWords": {
    "intro0": "15 months on purchases, 15 months on balance transfers"
   },
   "unique": [
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Foreign transaction fee",
     "words": "3% of each purchase abroad"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "18.49% to 28.49% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "all of it, as known in mid 2026"
    }
   ]
  },
  {
   "id": "citi-strata",
   "bank": "Citi",
   "n": "Strata",
   "network": "Mastercard",
   "fee": 0,
   "amt": 20000,
   "unit": "ty",
   "spend": 1000,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "travelPortal",
      "x": 5
     },
     {
      "cat": "groceries",
      "x": 3
     },
     {
      "cat": "transit",
      "x": 3
     },
     {
      "cat": "gas",
      "x": 3
     },
     {
      "cat": "streaming",
      "x": 3
     },
     {
      "cat": "dining",
      "x": 2
     }
    ],
    "picks": [],
    "words": "5x hotels, car rentals and attractions on Citi Travel, 3x supermarkets, select transit, gas and EV charging, 3x one category you pick (streaming by default), 2x restaurants, 1x everything else"
   },
   "credits": [],
   "source": "The card: https://www.mastercard.com/us/en/personal/find-a-card/credit-card/issuers/citi.html (issuer). The offer: onemileatatime.com Citi Strata offers (Oct 2026)",
   "checked": "2026-11-06",
   "has": {
    "intro0": true
   },
   "hasWords": {
    "intro0": "15 months on purchases, 15 months on balance transfers"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "20,000 ThankYou points (the source gives no window; the other Strata cards give three months)"
    },
    {
     "label": "A category you pick",
     "words": "3x in one category you pick (streaming by default). The list of choices is on the page of the bank."
    },
    {
     "label": "What it earns",
     "words": "Points"
    },
    {
     "label": "Foreign transaction fee",
     "words": "3% of each purchase abroad"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "18.74% to 28.74% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "foreign fee"
    }
   ]
  },
  {
   "id": "citi-strata-premier",
   "bank": "Citi",
   "n": "Strata Premier",
   "network": "Mastercard",
   "fee": 95,
   "amt": 60000,
   "unit": "ty",
   "spend": 4000,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "travelPortal",
      "x": 10
     },
     {
      "cat": "airline",
      "x": 3
     },
     {
      "cat": "hotel",
      "x": 3
     },
     {
      "cat": "dining",
      "x": 3
     },
     {
      "cat": "groceries",
      "x": 3
     },
     {
      "cat": "gas",
      "x": 3
     }
    ],
    "picks": [],
    "words": "10x hotels, car rentals and attractions on Citi Travel, 3x air travel, other hotels, restaurants, supermarkets, gas and EV charging, 1x everything else"
   },
   "credits": [
    {
     "name": "Hotel benefit",
     "value": 100,
     "words": "$100 off one hotel stay of $500 or more a calendar year, booked on cititravel.com"
    }
   ],
   "source": "The card: https://www.citi.com/credit-cards/citi-strata-premier-credit-card (issuer). The offer: onemileatatime.com Citi Strata offers (Oct 2026); wallethub.com Citi sign-up bonuses (Nov 2026); nerdwallet.com best bonus offers (Nov 2026); cnbc.com/select best Citi cards (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "rental": true,
    "tripCancel": true,
    "tripDelay": true,
    "baggage": true,
    "noForeignFee": true
   },
   "hasWords": {
    "rental": "MasterRental car coverage, secondary",
    "tripCancel": "Trip cancellation and interruption",
    "tripDelay": "Trip delay",
    "baggage": "Lost or damaged luggage"
   },
   "unique": [
    {
     "label": "What it earns",
     "words": "Points"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "20.24% to 28.24% a year, as a hint. Your own rate is on your statement"
    }
   ]
  },
  {
   "id": "citi-strata-elite",
   "bank": "Citi",
   "n": "Strata Elite",
   "network": "Mastercard",
   "fee": 595,
   "amt": 75000,
   "unit": "ty",
   "spend": 6000,
   "months": 3,
   "min": "excellent",
   "earn": {
    "base": 1.5,
    "rates": [
     {
      "cat": "travelPortal",
      "x": 12
     },
     {
      "cat": "dining",
      "x": 3
     }
    ],
    "picks": [],
    "words": "12x hotels, car rentals and attractions and 6x air on Citi Travel, 6x restaurants Friday and Saturday 6 PM to 6 AM ET (3x other times), 1.5x everything else"
   },
   "credits": [
    {
     "name": "Hotel credit",
     "value": 300,
     "words": "Up to $300 off a 2-night stay on cititravel.com each year"
    },
    {
     "name": "Splurge credit",
     "value": 200,
     "words": "Up to $200 a year at chosen brands (from mid 2026; check)"
    },
    {
     "name": "Blacklane",
     "value": 200,
     "words": "Up to $200 a year on Blacklane rides (from mid 2026; check)"
    }
   ],
   "source": "The card: https://www.mastercard.com/us/en/personal/find-a-card/credit-card/issuers/citi.html (issuer). The offer: onemileatatime.com Citi Strata offers (Oct 2026); wallethub.com Citi sign-up bonuses (Nov 2026); cnbc.com/select best Citi cards (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "rental": true,
    "tripCancel": true,
    "tripDelay": true,
    "lounge": true,
    "noForeignFee": true
   },
   "hasWords": {
    "rental": "Rental car coverage",
    "tripCancel": "Trip cancellation and interruption",
    "tripDelay": "Trip delay",
    "lounge": "Priority Pass and Admirals Club passes"
   },
   "unique": [
    {
     "label": "What it earns",
     "words": "Points"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "20.74% to 28.74% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "the splurge and Blacklane credits and the protections (as known in mid 2026)"
    }
   ]
  },
  {
   "id": "citi-simplicity",
   "bank": "Citi",
   "n": "Simplicity",
   "network": "Mastercard",
   "fee": 0,
   "amt": 0,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 0,
    "rates": [],
    "picks": [],
    "words": "No rewards; no late fees and no penalty APR"
   },
   "credits": [],
   "source": "The card: https://www.citi.com/credit-cards/citi-simplicity-credit-card (unverified). The offer: cnbc.com/select best Citi cards (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "intro0": true
   },
   "hasWords": {
    "intro0": "12 months on purchases, 21 months on balance transfers"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "No welcome offer. A long 0% period instead"
    },
    {
     "label": "What it earns",
     "words": "None"
    },
    {
     "label": "Foreign transaction fee",
     "words": "3% of each purchase abroad"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "18.24% to 28.99% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "APR range and intro, as known in mid 2026"
    }
   ]
  },
  {
   "id": "citi-diamond-preferred",
   "bank": "Citi",
   "n": "Diamond Preferred",
   "network": "Mastercard",
   "fee": 0,
   "amt": 0,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 0,
    "rates": [],
    "picks": [],
    "words": "No rewards"
   },
   "credits": [],
   "source": "The card: https://www.mastercard.com/us/en/personal/find-a-card/credit-card/issuers/citi.html (issuer). The offer: cnbc.com/select best Citi cards (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "intro0": true
   },
   "hasWords": {
    "intro0": "12 months on purchases, 21 months on balance transfers"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "No welcome offer. A long 0% period instead"
    },
    {
     "label": "What it earns",
     "words": "None"
    },
    {
     "label": "Foreign transaction fee",
     "words": "3% of each purchase abroad"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "16.74% to 27.49% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "foreign fee"
    }
   ]
  },
  {
   "id": "citi-costco",
   "bank": "Citi",
   "n": "Costco Anywhere Visa",
   "network": "Visa",
   "fee": 0,
   "amt": null,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "gas",
      "x": 4,
      "cap": 7000,
      "per": "year",
      "then": 1
     },
     {
      "cat": "dining",
      "x": 3
     },
     {
      "cat": "travel",
      "x": 3
     },
     {
      "cat": "store",
      "x": 2
     }
    ],
    "picks": [],
    "words": "5% gas at Costco and 4% other gas and EV charging (up to $7,000 a year), 3% restaurants and travel, 2% Costco, 1% everything else; paid once a year as a reward certificate"
   },
   "credits": [],
   "source": "The card: https://www.citi.com/credit-cards/citi-costco-anywhere-visa-credit-card (unverified). The offer: cnbc.com/select best Citi cards (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "rental": true,
    "purchase": true,
    "warranty": true,
    "noForeignFee": true,
    "store": true
   },
   "hasWords": {
    "rental": "Secondary rental car coverage",
    "purchase": "Damage and theft purchase protection",
    "warranty": "Extended warranty",
    "store": "Costco"
   },
   "unique": [
    {
     "label": "Why no dollar value",
     "words": "No welcome offer was found for it in today's sources."
    },
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "19.99% to 19.99% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Note",
     "words": "Needs a Costco membership"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "all of it, as known in mid 2026"
    }
   ]
  },
  {
   "id": "citi-best-buy",
   "bank": "Citi",
   "n": "My Best Buy Visa",
   "network": "Visa",
   "fee": 0,
   "amt": null,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "store",
      "x": 5
     },
     {
      "cat": "gas",
      "x": 3
     },
     {
      "cat": "dining",
      "x": 2
     },
     {
      "cat": "groceries",
      "x": 2
     }
    ],
    "picks": [],
    "words": "5% back at Best Buy (6% for members), 3% gas, 2% dining and groceries, 1% everything else"
   },
   "credits": [],
   "source": "The card: https://www.bestbuy.com/site/misc/best-buy-credit-cards/pcmcat102500050032.c (unverified). The offer: cnbc.com/select best Citi cards (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "store": true
   },
   "hasWords": {
    "store": "Best Buy"
   },
   "unique": [
    {
     "label": "Why no dollar value",
     "words": "No welcome offer was found for it in today's sources."
    },
    {
     "label": "What it earns",
     "words": "Points"
    },
    {
     "label": "Foreign transaction fee",
     "words": "3% of each purchase abroad"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "30.74% to 30.74% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "all of it, as known in mid 2026"
    }
   ]
  },
  {
   "id": "citi-aadvantage-platinum",
   "bank": "Citi",
   "n": "AAdvantage Platinum Select",
   "network": "Mastercard",
   "fee": 99,
   "amt": 50000,
   "unit": "aa",
   "spend": 0,
   "months": 3,
   "min": "good",
   "spendKnown": false,
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "airline",
      "x": 2
     },
     {
      "cat": "dining",
      "x": 2
     },
     {
      "cat": "gas",
      "x": 2
     }
    ],
    "picks": [],
    "words": "2x American Airlines, restaurants and gas, 1x everything else"
   },
   "credits": [
    {
     "name": "First checked bag free",
     "value": 140,
     "words": "On domestic American flights; about $140 a year on two round trips"
    }
   ],
   "source": "The card: https://www.aa.com/i18n/aadvantage-program/aadvantage-credit-cards.jsp (unverified). The offer: bankbonus.com Citi promotions (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "noForeignFee": true,
    "bag": true
   },
   "hasWords": {
    "bag": "On domestic American flights; about $140 a year on two round trips"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "50,000 miles (the spending it needs was not in today's sources)"
    },
    {
     "label": "Where the sources differ",
     "words": "Another site shows 80,000 miles through in-flight or airport links"
    },
    {
     "label": "What it earns",
     "words": "Miles"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "20.24% to 29.74% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Note",
     "words": "$0 the first year"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "all of it, as known in mid 2026"
    }
   ]
  },
  {
   "id": "bofa-customized-cash",
   "bank": "Bank of America",
   "n": "Customized Cash Rewards",
   "network": "Visa",
   "fee": 0,
   "amt": 200,
   "unit": "cash",
   "spend": 1000,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "groceries",
      "x": 2,
      "cap": 2500,
      "per": "quarter",
      "then": 1
     }
    ],
    "picks": [
     {
      "x": 3,
      "count": 1,
      "from": [
       "gas",
       "online",
       "dining",
       "travel",
       "drugstore",
       "home"
      ],
      "cap": 2500,
      "per": "quarter",
      "then": 1
     }
    ],
    "words": "3% in one category you pick (gas, online shopping, dining, travel, drugstores or home improvement), 2% groceries and wholesale clubs (the 3% and 2% share $2,500 a quarter), 1% everything else"
   },
   "credits": [],
   "source": "The card: https://www.bankofamerica.com/credit-cards/ (issuer). The offer: creditkarma.com sign-up bonus cards (Nov 2026); nerdwallet.com best bonus offers (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "intro0": true
   },
   "hasWords": {
    "intro0": "15 months on purchases, 15 months on balance transfers"
   },
   "unique": [
    {
     "label": "One limit for two rates",
     "words": "The 3% and the 2% share one limit of $2,500 a quarter. The game counts a limit for each rate, so it can count a little too much."
    },
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Foreign transaction fee",
     "words": "3% of each purchase abroad"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "17.74% to 27.74% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Note",
     "words": "Preferred Rewards clients earn 25% to 75% more"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "foreign fee"
    }
   ]
  },
  {
   "id": "bofa-unlimited-cash",
   "bank": "Bank of America",
   "n": "Unlimited Cash Rewards",
   "network": "Visa",
   "fee": 0,
   "amt": 200,
   "unit": "cash",
   "spend": 1000,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1.5,
    "rates": [],
    "picks": [],
    "words": "1.5% on everything"
   },
   "credits": [],
   "source": "The card: https://www.bankofamerica.com/credit-cards/ (issuer). The offer: doctorofcredit.com best current sign-up bonuses (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "intro0": true
   },
   "hasWords": {
    "intro0": "15 months on purchases, 15 months on balance transfers"
   },
   "unique": [
    {
     "label": "Where the sources differ",
     "words": "Another site shows $250"
    },
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Foreign transaction fee",
     "words": "3% of each purchase abroad"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "17.74% to 27.74% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Note",
     "words": "Preferred Rewards clients earn 25% to 75% more"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "foreign fee"
    }
   ]
  },
  {
   "id": "bofa-travel-rewards",
   "bank": "Bank of America",
   "n": "Travel Rewards",
   "network": "Visa",
   "fee": 0,
   "amt": 25000,
   "unit": "bofa",
   "spend": 1000,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1.5,
    "rates": [
     {
      "cat": "travelPortal",
      "x": 3
     }
    ],
    "picks": [],
    "words": "1.5x on everything, 3x on travel booked with Bank of America Travel"
   },
   "credits": [],
   "source": "The card: https://www.bankofamerica.com/credit-cards/ (issuer). The offer: creditkarma.com sign-up bonus cards (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "noForeignFee": true,
    "intro0": true
   },
   "hasWords": {
    "intro0": "15 months on purchases, 15 months on balance transfers"
   },
   "unique": [
    {
     "label": "What it earns",
     "words": "Points"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "17.74% to 27.74% a year, as a hint. Your own rate is on your statement"
    }
   ]
  },
  {
   "id": "bofa-premium-rewards",
   "bank": "Bank of America",
   "n": "Premium Rewards",
   "network": "Visa",
   "fee": 95,
   "amt": 60000,
   "unit": "bofa",
   "spend": 0,
   "months": 3,
   "min": "good",
   "spendKnown": false,
   "earn": {
    "base": 1.5,
    "rates": [
     {
      "cat": "travel",
      "x": 2
     },
     {
      "cat": "dining",
      "x": 2
     }
    ],
    "picks": [],
    "words": "2x travel and dining, 1.5x everything else"
   },
   "credits": [
    {
     "name": "Airline fees and TSA PreCheck or Global Entry",
     "value": 100,
     "words": "Up to $100 a year in airline incidentals, plus up to $100 for TSA PreCheck or Global Entry (every 4 years)"
    }
   ],
   "source": "The card: https://www.bankofamerica.com/credit-cards/ (issuer). The offer: doctorofcredit.com best current sign-up bonuses (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "rental": true,
    "tripCancel": true,
    "tripDelay": true,
    "baggage": true,
    "purchase": true,
    "warranty": true,
    "noForeignFee": true
   },
   "hasWords": {
    "rental": "Rental car coverage",
    "tripCancel": "Trip cancellation and interruption",
    "tripDelay": "Trip delay",
    "baggage": "Lost and delayed baggage",
    "purchase": "Purchase protection",
    "warranty": "Extended warranty"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "60,000 points, worth $600 as a statement credit (the spending it needs was not in today's sources)"
    },
    {
     "label": "What it earns",
     "words": "Points"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "19.74% to 27.74% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "the split of the $200 in credits; protection limits"
    }
   ]
  },
  {
   "id": "bofa-bankamericard",
   "bank": "Bank of America",
   "n": "BankAmericard",
   "network": "Visa",
   "fee": 0,
   "amt": 0,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 0,
    "rates": [],
    "picks": [],
    "words": "No rewards; no penalty APR"
   },
   "credits": [],
   "source": "The card: https://www.bankofamerica.com/credit-cards/ (issuer). The offer: creditkarma.com sign-up bonus cards (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "intro0": true
   },
   "hasWords": {
    "intro0": "21 months on purchases, 21 months on balance transfers"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "No welcome offer. A long 0% period instead"
    },
    {
     "label": "What it earns",
     "words": "None"
    },
    {
     "label": "Foreign transaction fee",
     "words": "3% of each purchase abroad"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "15.24% to 26.24% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "foreign fee"
    }
   ]
  },
  {
   "id": "bofa-customized-cash-secured",
   "bank": "Bank of America",
   "n": "Customized Cash Rewards Secured",
   "network": "Visa",
   "fee": 0,
   "amt": null,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "groceries",
      "x": 2,
      "cap": 2500,
      "per": "quarter",
      "then": 1
     }
    ],
    "picks": [
     {
      "x": 3,
      "count": 1,
      "from": [
       "gas",
       "online",
       "dining",
       "travel",
       "drugstore",
       "home"
      ],
      "cap": 2500,
      "per": "quarter",
      "then": 1
     }
    ],
    "words": "3% in one category you pick, 2% groceries and wholesale clubs (sharing $2,500 a quarter), 1% everything else"
   },
   "credits": [],
   "source": "The card: https://www.bankofamerica.com/credit-cards/ (issuer). The offer: creditkarma.com sign-up bonus cards (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "secured": true
   },
   "hasWords": {
    "secured": "Deposit of $200 to $5,000, reviewed for return"
   },
   "unique": [
    {
     "label": "Why no dollar value",
     "words": "No welcome offer was found for it in today's sources."
    },
    {
     "label": "One limit for two rates",
     "words": "The 3% and the 2% share one limit of $2,500 a quarter. The game counts a limit for each rate, so it can count a little too much."
    },
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Foreign transaction fee",
     "words": "3% of each purchase abroad"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "27.74% to 27.74% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "foreign fee"
    }
   ]
  },
  {
   "id": "wf-active-cash",
   "bank": "Wells Fargo",
   "n": "Active Cash",
   "network": "Visa",
   "fee": 0,
   "amt": 100,
   "unit": "cash",
   "spend": 500,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 2,
    "rates": [],
    "picks": [],
    "words": "2% on everything"
   },
   "credits": [],
   "source": "The card: https://creditcards.wellsfargo.com/cards/active-cash-credit-card (issuer). The offer: creditkarma.com sign-up bonus cards (Nov 2026); wallethub.com best sign-up bonuses (Nov 2026); cardcritics.com best sign-up bonuses",
   "checked": "2026-11-06",
   "has": {
    "rental": true,
    "cellPhone": true,
    "intro0": true
   },
   "hasWords": {
    "rental": "Secondary collision damage waiver on rentals paid with the card (decline the counter coverage)",
    "cellPhone": "Cell phone protection: up to $600 a claim, $25 deductible, 2 claims a year, when the monthly phone bill is paid with the card. Not for a lost phone",
    "intro0": "12 months on purchases, 12 months on balance transfers"
   },
   "unique": [
    {
     "label": "Where the sources differ",
     "words": "Another site shows $200 after $1,500 in 6 months"
    },
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Foreign transaction fee",
     "words": "3% of each purchase abroad"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "18.74% to 28.74% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "foreign fee"
    }
   ]
  },
  {
   "id": "wf-autograph",
   "bank": "Wells Fargo",
   "n": "Autograph",
   "network": "Visa",
   "fee": 0,
   "amt": 20000,
   "unit": "wf",
   "spend": 1000,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "dining",
      "x": 3
     },
     {
      "cat": "travel",
      "x": 3
     },
     {
      "cat": "gas",
      "x": 3
     },
     {
      "cat": "transit",
      "x": 3
     },
     {
      "cat": "streaming",
      "x": 3
     },
     {
      "cat": "phone",
      "x": 3
     }
    ],
    "picks": [],
    "words": "3x restaurants, travel, gas, transit, popular streaming and phone plans, 1x everything else"
   },
   "credits": [],
   "source": "The card: https://creditcards.wellsfargo.com/cards/ (issuer). The offer: creditkarma.com sign-up bonus cards (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "rental": true,
    "cellPhone": true,
    "noForeignFee": true,
    "intro0": true
   },
   "hasWords": {
    "rental": "Secondary collision damage waiver on rentals paid with the card (decline the counter coverage)",
    "cellPhone": "Cell phone protection: up to $600 a claim, $25 deductible, 2 claims a year, when the monthly phone bill is paid with the card. Not for a lost phone",
    "intro0": "12 months on purchases"
   },
   "unique": [
    {
     "label": "What it earns",
     "words": "Points"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "18.74% to 28.74% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "cell phone protection on this card (Wells Fargo offers it on its Visa Signature cards; checked on Active Cash)"
    }
   ]
  },
  {
   "id": "wf-autograph-journey",
   "bank": "Wells Fargo",
   "n": "Autograph Journey",
   "network": "Visa",
   "fee": 95,
   "amt": 60000,
   "unit": "wf",
   "spend": 4000,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "hotel",
      "x": 5
     },
     {
      "cat": "airline",
      "x": 4
     },
     {
      "cat": "travel",
      "x": 3
     },
     {
      "cat": "dining",
      "x": 3
     }
    ],
    "picks": [],
    "words": "5x hotels, 4x airlines, 3x other travel and restaurants, 1x everything else"
   },
   "credits": [
    {
     "name": "Airline credit",
     "value": 50,
     "words": "$50 a year after a $50 airline purchase"
    }
   ],
   "source": "The card: https://creditcards.wellsfargo.com/cards/ (issuer). The offer: doctorofcredit.com best current sign-up bonuses (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "rental": true,
    "tripCancel": true,
    "baggage": true,
    "cellPhone": true,
    "noForeignFee": true
   },
   "hasWords": {
    "rental": "Rental car coverage",
    "tripCancel": "Trip cancellation and interruption",
    "baggage": "Lost luggage",
    "cellPhone": "Cell phone protection: up to $1,000 a claim, $25 deductible, 2 claims a year, when the phone bill is paid with the card"
   },
   "unique": [
    {
     "label": "What it earns",
     "words": "Points"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "20.24% to 28.24% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "APR range; cell phone protection amount ($1,000 as known in mid 2026); protections"
    }
   ]
  },
  {
   "id": "wf-reflect",
   "bank": "Wells Fargo",
   "n": "Reflect",
   "network": "Visa",
   "fee": 0,
   "amt": 0,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 0,
    "rates": [],
    "picks": [],
    "words": "No rewards"
   },
   "credits": [],
   "source": "The card: https://creditcards.wellsfargo.com/cards/ (issuer). The offer: creditkarma.com sign-up bonus cards (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "cellPhone": true,
    "intro0": true
   },
   "hasWords": {
    "cellPhone": "Cell phone protection: up to $600 a claim, $25 deductible, 2 claims a year, when the monthly phone bill is paid with the card. Not for a lost phone",
    "intro0": "21 months on purchases, 21 months on balance transfers"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "No welcome offer. A long 0% period instead"
    },
    {
     "label": "What it earns",
     "words": "None"
    },
    {
     "label": "Foreign transaction fee",
     "words": "3% of each purchase abroad"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "17.74% to 28.49% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "cell phone protection on this card; foreign fee"
    }
   ]
  },
  {
   "id": "usb-cash-plus",
   "bank": "US Bank",
   "n": "Cash+",
   "network": "Visa",
   "fee": 0,
   "amt": 200,
   "unit": "cash",
   "spend": 1000,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [],
    "picks": [
     {
      "x": 5,
      "count": 2,
      "from": [
       "phone",
       "streaming",
       "home",
       "entertainment",
       "online",
       "transit"
      ],
      "cap": 2000,
      "per": "quarter",
      "then": 1
     },
     {
      "x": 2,
      "count": 1,
      "from": [
       "gas",
       "groceries",
       "dining"
      ]
     }
    ],
    "words": "5% on two categories you pick each quarter (first $2,000 combined, enroll), 2% on one everyday category (gas, groceries or restaurants), 1% everything else"
   },
   "credits": [],
   "source": "The card: https://www.usbank.com/credit-cards/compare.html (issuer). The offer: doctorofcredit.com best current sign-up bonuses (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "intro0": true
   },
   "hasWords": {
    "intro0": "15 months on purchases, 15 months on balance transfers"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "$200 (the source gives no window; three months assumed)"
    },
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Foreign transaction fee",
     "words": "3% of each purchase abroad"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "19.49% to 28.74% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "APR range and the 5% category list (as known in mid 2026)"
    }
   ]
  },
  {
   "id": "usb-altitude-go",
   "bank": "US Bank",
   "n": "Altitude Go",
   "network": "Visa",
   "fee": 0,
   "amt": null,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "dining",
      "x": 4,
      "cap": 2000,
      "per": "quarter",
      "then": 1
     },
     {
      "cat": "groceries",
      "x": 2
     },
     {
      "cat": "gas",
      "x": 2
     },
     {
      "cat": "streaming",
      "x": 2
     }
    ],
    "picks": [],
    "words": "4x dining, takeout and delivery (first $2,000 a quarter), 2x groceries, gas, EV charging and streaming, 1x everything else"
   },
   "credits": [
    {
     "name": "Streaming credit",
     "value": 15,
     "words": "$15 a year after 11 months in a row of streaming purchases"
    }
   ],
   "source": "The card: https://www.usbank.com/credit-cards/compare.html (issuer). The offer: doctorofcredit.com best current sign-up bonuses (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "noForeignFee": true,
    "intro0": true
   },
   "hasWords": {
    "intro0": "15 months on purchases, 15 months on balance transfers"
   },
   "unique": [
    {
     "label": "Why no dollar value",
     "words": "No welcome offer was found for it in today's sources."
    },
    {
     "label": "What it earns",
     "words": "Points"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "18.24% to 28.74% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "APR range"
    }
   ]
  },
  {
   "id": "usb-altitude-connect",
   "bank": "US Bank",
   "n": "Altitude Connect",
   "network": "Visa",
   "fee": 0,
   "amt": null,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "travel",
      "x": 4
     },
     {
      "cat": "gas",
      "x": 4,
      "cap": 1000,
      "per": "quarter",
      "then": 1
     },
     {
      "cat": "dining",
      "x": 2
     },
     {
      "cat": "streaming",
      "x": 2
     },
     {
      "cat": "groceries",
      "x": 2
     }
    ],
    "picks": [],
    "words": "4x travel and gas and EV charging (gas on the first $1,000 a quarter), 2x dining, streaming and groceries, 1x everything else"
   },
   "credits": [],
   "source": "The card: https://www.usbank.com/credit-cards/compare.html (issuer). The offer: doctorofcredit.com best current sign-up bonuses (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "noForeignFee": true,
    "intro0": true
   },
   "hasWords": {
    "intro0": "15 months on purchases, 15 months on balance transfers"
   },
   "unique": [
    {
     "label": "Why no dollar value",
     "words": "No welcome offer was found for it in today's sources."
    },
    {
     "label": "What it earns",
     "words": "Points"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "18.24% to 28.74% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "APR range and fee (now $0, as known in mid 2026)"
    }
   ]
  },
  {
   "id": "usb-smartly",
   "bank": "US Bank",
   "n": "Smartly Visa Signature",
   "network": "Visa",
   "fee": 0,
   "amt": null,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 2,
    "rates": [],
    "picks": [],
    "words": "2% on everything, up to 4% with qualifying US Bank savings balances (first $10,000 a billing cycle)"
   },
   "credits": [],
   "source": "The card: https://www.usbank.com/credit-cards/compare.html (issuer). The offer: doctorofcredit.com best current sign-up bonuses (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "intro0": true
   },
   "hasWords": {
    "intro0": "12 months on purchases, 12 months on balance transfers"
   },
   "unique": [
    {
     "label": "Why no dollar value",
     "words": "No welcome offer was found for it in today's sources."
    },
    {
     "label": "A higher rate with savings",
     "words": "Up to 4% with qualifying US Bank savings balances, on the first $10,000 of a billing cycle. The game counts 2%."
    },
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Foreign transaction fee",
     "words": "3% of each purchase abroad"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "18.24% to 28.74% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "APR range"
    }
   ]
  },
  {
   "id": "usb-secured",
   "bank": "US Bank",
   "n": "Secured Visa",
   "network": "Visa",
   "fee": 0,
   "amt": null,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 0,
    "rates": [],
    "picks": [],
    "words": "No rewards"
   },
   "credits": [],
   "source": "The card: https://www.usbank.com/credit-cards/compare.html (issuer). The offer: doctorofcredit.com best current sign-up bonuses (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "secured": true
   },
   "hasWords": {
    "secured": "Deposit of $300 to $5,000"
   },
   "unique": [
    {
     "label": "Why no dollar value",
     "words": "No welcome offer was found for it in today's sources."
    },
    {
     "label": "What it earns",
     "words": "None"
    },
    {
     "label": "Foreign transaction fee",
     "words": "3% of each purchase abroad"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "28.74% to 28.74% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "APR"
    }
   ]
  },
  {
   "id": "discover-it-cash-back",
   "bank": "Discover",
   "n": "Discover it Cash Back",
   "network": "Discover",
   "fee": 0,
   "amt": 200,
   "unit": "cash",
   "spend": 500,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [
     {
      "cat": "rotating",
      "x": 5,
      "cap": 1500,
      "per": "quarter",
      "then": 1
     }
    ],
    "picks": [],
    "words": "5% on rotating quarterly categories (up to $1,500 a quarter, activate), 1% everything else; the first year is matched"
   },
   "credits": [],
   "source": "The card: https://www.capitalone.com/credit-cards/compare (issuer). The offer: nerdwallet.com best bonus offers (Nov 2026); doctorofcredit.com best current sign-up bonuses (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "noForeignFee": true,
    "intro0": true
   },
   "hasWords": {
    "intro0": "15 months on purchases, 15 months on balance transfers"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "$200, and Discover matches all the cash back you earn in the first year"
    },
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "18.24% to 27.24% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Note",
     "words": "Accounts move to the Capital One app from Jul 27, 2026"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "APR range"
    }
   ]
  },
  {
   "id": "discover-it-miles",
   "bank": "Discover",
   "n": "Discover it Miles",
   "network": "Discover",
   "fee": 0,
   "amt": null,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1.5,
    "rates": [
     {
      "cat": "travelPortal",
      "x": 5
     }
    ],
    "picks": [],
    "words": "1.5x on everything, 5% hotels, vacation rentals and rental cars on Capital One Travel; the first year is matched"
   },
   "credits": [],
   "source": "The card: https://doctorofcredit.com/discover-cards-will-transition-to-capital-one-website-app-on-july-27-2026 (secondary). The offer: doctorofcredit.com best current sign-up bonuses (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "noForeignFee": true,
    "intro0": true
   },
   "hasWords": {
    "intro0": "15 months on purchases"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "Discover matches the miles you earn in the first year"
    },
    {
     "label": "Why no dollar value",
     "words": "Its offer is a match of the first year's miles, with no set amount to count."
    },
    {
     "label": "What it earns",
     "words": "Miles"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "18.24% to 27.24% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "APR range and intro"
    }
   ]
  },
  {
   "id": "discover-it-chrome",
   "bank": "Discover",
   "n": "Discover it Chrome",
   "network": "Discover",
   "fee": 0,
   "amt": null,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [],
    "picks": [
     {
      "x": 2,
      "count": 2,
      "from": [
       "gas",
       "dining"
      ],
      "cap": 1000,
      "per": "quarter",
      "then": 1
     }
    ],
    "words": "2% gas and restaurants (up to $1,000 a quarter combined), 1% everything else"
   },
   "credits": [],
   "source": "The card: https://www.discover.com/credit-cards/ (unverified). The offer: doctorofcredit.com best current sign-up bonuses (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "noForeignFee": true,
    "intro0": true
   },
   "hasWords": {
    "intro0": "6 months on purchases, 18 months on balance transfers"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "Discover matches the cash back you earn in the first year"
    },
    {
     "label": "Why no dollar value",
     "words": "Its offer is a match of the first year's cash back, with no set amount to count."
    },
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "18.24% to 27.24% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "all of it, as known in mid 2026"
    }
   ]
  },
  {
   "id": "discover-it-secured",
   "bank": "Discover",
   "n": "Discover it Secured",
   "network": "Discover",
   "fee": 0,
   "amt": null,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [],
    "picks": [
     {
      "x": 2,
      "count": 2,
      "from": [
       "gas",
       "dining"
      ],
      "cap": 1000,
      "per": "quarter",
      "then": 1
     }
    ],
    "words": "2% gas and restaurants (up to $1,000 a quarter combined), 1% everything else"
   },
   "credits": [],
   "source": "The card: https://doctorofcredit.com/capital-one-launches-discover-it-secured-cash-back-credit-card (unverified). The offer: doctorofcredit.com best current sign-up bonuses (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "noForeignFee": true,
    "secured": true
   },
   "hasWords": {
    "secured": "Refundable deposit from $200"
   },
   "unique": [
    {
     "label": "The welcome offer in words",
     "words": "Discover matches the cash back you earn in the first year"
    },
    {
     "label": "Why no dollar value",
     "words": "Its offer is a match of the first year's cash back, with no set amount to count."
    },
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "27.24% to 27.24% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "all of it, as known in mid 2026"
    }
   ]
  },
  {
   "id": "apple-card",
   "bank": "Apple",
   "n": "Apple Card",
   "network": "Mastercard",
   "fee": 0,
   "amt": null,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 1,
    "rates": [],
    "picks": [],
    "words": "3% at Apple and select merchants with Apple Pay, 2% with Apple Pay, 1% with the physical card"
   },
   "credits": [],
   "source": "The card: https://www.apple.com/newsroom/2026/01/chase-to-become-new-issuer-of-apple-card/ (issuer). The offer: doctorofcredit.com best current sign-up bonuses (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "noForeignFee": true
   },
   "hasWords": {},
   "unique": [
    {
     "label": "Why no dollar value",
     "words": "No welcome offer was found for it in today's sources."
    },
    {
     "label": "2x paid with Apple Pay",
     "words": "",
     "value": 2
    },
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "17.49% to 27.74% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Note",
     "words": "No fees. Chase becomes the issuer about two years after Jan 2026; Mastercard stays the network"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "the 3% merchant list"
    }
   ]
  },
  {
   "id": "td-target-circle",
   "bank": "TD Bank",
   "n": "Target Circle Card",
   "network": "",
   "fee": 0,
   "amt": null,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 0,
    "rates": [
     {
      "cat": "store",
      "x": 5
     }
    ],
    "picks": [],
    "words": "5% off at Target and Target.com"
   },
   "credits": [],
   "source": "The card: https://www.target.com/circlecard (unverified). The offer: doctorofcredit.com best current sign-up bonuses (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "store": true
   },
   "hasWords": {
    "store": "Target"
   },
   "unique": [
    {
     "label": "Why no dollar value",
     "words": "No welcome offer was found for it in today's sources."
    },
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Where it works",
     "words": "A store card: it works at Target only"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "29.95% to 29.95% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "APR, as known in mid 2026"
    }
   ]
  },
  {
   "id": "synchrony-lowes",
   "bank": "Synchrony",
   "n": "Lowe's Advantage Card",
   "network": "",
   "fee": 0,
   "amt": null,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 0,
    "rates": [
     {
      "cat": "store",
      "x": 5
     }
    ],
    "picks": [],
    "words": "5% off at Lowe's (or special financing instead)"
   },
   "credits": [],
   "source": "The card: https://www.lowes.com/l/credit/credit-center (unverified). The offer: doctorofcredit.com best current sign-up bonuses (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "store": true
   },
   "hasWords": {
    "store": "Lowe's"
   },
   "unique": [
    {
     "label": "Why no dollar value",
     "words": "No welcome offer was found for it in today's sources."
    },
    {
     "label": "What it earns",
     "words": "Cash back"
    },
    {
     "label": "Where it works",
     "words": "A store card: it works at Lowe's only"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "33.99% to 33.99% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "all of it, as known in mid 2026"
    }
   ]
  },
  {
   "id": "opensky-secured",
   "bank": "Capital Bank",
   "n": "OpenSky Secured Visa",
   "network": "Visa",
   "fee": 35,
   "amt": null,
   "unit": "cash",
   "spend": 0,
   "months": 3,
   "min": "good",
   "earn": {
    "base": 0,
    "rates": [],
    "picks": [],
    "words": "No rewards"
   },
   "credits": [],
   "source": "The card: https://www.openskycc.com/ (unverified). The offer: doctorofcredit.com best current sign-up bonuses (Nov 2026)",
   "checked": "2026-11-06",
   "has": {
    "secured": true
   },
   "hasWords": {
    "secured": "Deposit from $200; no credit check to apply"
   },
   "unique": [
    {
     "label": "Why no dollar value",
     "words": "No welcome offer was found for it in today's sources."
    },
    {
     "label": "What it earns",
     "words": "None"
    },
    {
     "label": "Foreign transaction fee",
     "words": "3% of each purchase abroad"
    },
    {
     "label": "Usual interest rate (APR)",
     "words": "25.64% to 25.64% a year, as a hint. Your own rate is on your statement"
    },
    {
     "label": "Not read again on the bank's page",
     "words": "all of it, as known in mid 2026"
    }
   ]
  }
 ]
};
