// Velora Bay — story, characters and dialogue. All names are original.
export const STORY = {
  city: 'Velora Bay',
  hero: 'Rex Delgado',
  intro: 'Rex Delgado came home to Velora Bay with nothing but a busted sedan and a debt to Mama Luz. The Kane Syndicate owns the harbor, the Strip and half the cops. Take the city back — one job, one car, one street at a time.',
  characters: {
    luz: 'Mama Luz — runs the Coral Cafe in Old Town. Knows every secret in Velora Bay.',
    dante: 'Dante Cole — fixer, garage owner, ex-getaway driver. Sells cars, buys silence.',
    kane: 'Victor Kane — head of the Kane Syndicate. Owns the harbor, the Neon Strip, the cops.',
    vega: 'Marisol Vega — Kane\'s former lieutenant. Now feeds Rex information, for a price.',
    cruz: 'Officer Cruz — the one honest cop left in the V.B.P.D. Sometimes looks the other way.',
  },
};

export const MISSION_DIALOGUE = {
  m1_start: [['LUZ', 'Rex! You owe me three months rent, chico. Drive my taxi, earn it back. Two fares, no excuses.'],
    ['REX', 'Two fares. Then we talk about Kane.']],
  m2_start: [['LUZ', 'A package came in for me at the Marina. Pick it up, bring it to the Coral Cafe. Quietly.'],
    ['REX', 'Quiet is my middle name, Luz.']],
  m3_start: [['DANTE', 'I need a Comet GT, cherry red, from the showroom lot on the Strip. Borrow it. Permanently.'],
    ['REX', 'Stealing a showroom car? That is a loud way to say hello to this city.'],
    ['DANTE', 'Loud is good. Kane needs to hear your name.']],
  m4_start: [['LUZ', 'Kane\'s boys are shaking down my neighbors on the Strip. Three of them. Teach them manners.'],
    ['REX', 'Manners. With my fists.']],
  m5_start: [['DANTE', 'A Kane truck full of "imported goods" is parked at the Harbor. Take the truck. Bring it to my garage.'],
    ['REX', 'A truck heist before lunch. Fine.']],
  m6_start: [['VEGA', 'My crew hits the Meridian Bank at noon. You drive. Get us out, lose the cops, bring us to the safehouse.'],
    ['REX', 'If this goes sideways, Vega, I am blaming you.'],
    ['VEGA', 'It will not go sideways. You are driving.']],
  m7_start: [['CRUZ', 'Off the record, Delgado: four Kane enforcers are meeting at the Marina tonight. The law cannot touch them. You can.'],
    ['REX', 'Off the record. Got it.']],
  m8_start: [['VEGA', 'Kane\'s courier drives a black Vantara from the Harbor to the Strip every night. Tail him. Do NOT let him see you. Then end it.'],
    ['REX', 'Tail, then end it. Poetry.']],
  m9_start: [['DANTE', 'Street race. Six checkpoints, three of Kane\'s best drivers. Beat them and the whole city hears your name.'],
    ['REX', 'I was born for this.']],
  m10_start: [['LUZ', 'It is time, Rex. Kane is in his penthouse on the Strip, guarded like a king. End him. End all of it.'],
    ['REX', 'For Velora Bay.']],
  m10_end: [['REX', 'Kane is done. The harbor, the Strip, the streets — they belong to the people again.'],
    ['LUZ', 'You did it, chico. Velora Bay is yours now.']],
};

export const TAXI_LINES = [
  'Where to, pal? Fast, I am late!',
  'The Strip, please. And step on it!',
  'Harbor, driver. I have a boat to catch.',
  'Old Town, the Coral Cafe. Lovely day, no?',
  'Downtown, the Meridian tower. Make it quick!',
];

export const PEDESTRIAN_LINES = [
  'Hey! Watch it!',
  'Velora Bay, baby!',
  'Did you see the race last night?',
  'Kane\'s boys were here again...',
  'Best sunsets in the world, right here.',
  'I love this city!',
];
