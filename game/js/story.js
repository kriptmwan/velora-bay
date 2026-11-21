// story.js — the people and the plot of Velora Bay. All names, places and
// dialogue are original. Rex Delgado, cab driver; Mama Luz, who raised him
// after his father disappeared; Dante Cole, the fixer who knows every door
// in the city; and Marcus Kane, who owns most of them.

export const CHARACTERS = {
  rex: {
    name: "Rex Delgado", role: "Hero — cab driver, ex-street racer",
    bio: "Grew up above Mama Luz's diner. Drove getaway cars as a kid, went straight as a cabbie, and is about to be pulled back in.",
  },
  luz: {
    name: "Mama Luz", role: "Mentor — runs the diner on the Neon Strip",
    bio: "Raised Rex after his father vanished into Kane's organisation. Her diner is the one neutral ground in Velora Bay.",
  },
  dante: {
    name: "Dante Cole", role: "Fixer — knows every door in the city",
    bio: "Ex-cop, current everything. Sells information, cars and second chances — usually in that order.",
  },
  kane: {
    name: "Marcus Kane", role: "Villain — head of the Kane Syndicate",
    bio: "Owns the bank, the docks and half the VCPD. His estate in the Hills is the last door Rex has to kick down.",
  },
  alvarez: {
    name: "Mrs. Alvarez", role: "First fare — retired schoolteacher",
    bio: "Tips well, talks the whole ride, and knows more about this city than any cop.",
  },
};

export const STORY_INTRO = [
  "Velora Bay, 9:30 AM. The sun is already cooking the Neon Strip.",
  "Rex Delgado is three fares from making rent when his phone buzzes: Mama Luz.",
  "'Rex, my driver called in sick. One fare. That's all. Then you're free.'",
  "One fare. That's how it always starts.",
];

export const MISSION_DIALOGUE = {
  0: ["Mama Luz: 'Mrs. Alvarez waits at the Marina. Don't keep her waiting — she tips, but she remembers.'"],
  1: ["Dante Cole: 'Kane's collectors work the Old Town corner. Make them walk away, Rex. Loud is fine.'"],
  2: ["Dante Cole: 'That Comet GT on the Strip? It's Kane's prize. Take it. If the cops bite, outrun them.'"],
  3: ["Dante Cole: 'Warehouse 7. One crate, no witnesses. The guards are Kane's — they won't talk it out.'"],
  4: ["Mama Luz: 'The accountant is scared, Rex. Scared men talk. Keep him breathing until the church.'"],
  5: ["Dante Cole: 'Velora Bank holds Kane's ledger cash. Walk in like you own it. Walk out richer.'"],
  6: ["Dante Cole: 'It's a trap, Rex. It was always a trap. Spring it anyway — they won't expect that.'"],
  7: ["Dante Cole: 'Luz's nephew is burning rubber with the whole city behind him. Be his way out.'"],
  8: ["Mama Luz: 'The lieutenant meets his buyers at Kane Tower tonight. End the meeting, take the ledger.'"],
  9: ["Mama Luz: 'Kane is at the estate. No more errands, no more debts. Finish it, Rex. For your father.'"],
};

export const OUTRO = [
  "The Hills are quiet for the first time in years.",
  "Kane's empire folds by morning. The bank, the docks, the Strip — free.",
  "Rex parks the Comet GT outside Mama Luz's diner and orders the special.",
  "Velora Bay is his now. King of Velora.",
];

export function briefingFor(missionId) {
  return MISSION_DIALOGUE[missionId] || ["Dante Cole: 'You know the job. Get it done.'"];
}
