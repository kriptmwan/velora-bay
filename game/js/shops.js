// Velora Bay — shops: guns, armor, food, payphone bribes, garage paint/repair.
import { S, addCash, showToast, say } from './state.js';
import { WEAPONS } from './combat.js';
import { dist } from './utils.js';
import { sfx } from './audio.js';

export function nearestShop() {
  const p = S.player;
  let best = null, bd = 110;
  for (const sh of S.city.shops) {
    const d = dist(p.x, p.y, sh.x, sh.y);
    if (d < bd) { bd = d; best = sh; }
  }
  return best;
}

export function garageAction() {
  const p = S.player;
  const sh = nearestShop();
  if (sh && sh.kind === 'paint' && p.car) {
    if (S.cash >= 150) {
      addCash(-150);
      p.car.color = ['#e84d2e', '#2e9e8c', '#ffd23f', '#7a3dc9', '#4d7ac9'][Math.floor(Math.random() * 5)];
      p.car.health = 100;
      showToast('Respray + full repair! -$150. Looking sharp.', 3);
      sfx('pickup');
    } else showToast('Respray costs $150 — you are short.', 2);
    return;
  }
  if (sh && sh.kind === 'gun') { buyMenu('gun'); return; }
  if (sh && sh.kind === 'armor') { buyMenu('armor'); return; }
  if (sh && sh.kind === 'food') {
    if (S.cash >= 20) { addCash(-20); S.player.health = Math.min(100, S.player.health + 50); showToast('Burger Bay meal: +50 health. -$20', 2); sfx('pickup'); }
    else showToast('A meal costs $20.', 2);
    return;
  }
  if (sh && sh.kind === 'phone') { phoneAction(); return; }
  if (sh && sh.kind === 'clothes') {
    showToast('Velora Threads: new threads, same Rex. (cosmetic)', 2);
    return;
  }
  // near the garage landmark: store current car
  const g = S.city.landmarks.find(l => l.id === 'garage');
  if (g && dist(p.x, p.y, g.x, g.y) < 160 && p.car) {
    if (!S.ownedCars.includes(p.car.id)) {
      S.ownedCars.push(p.car.id);
      showToast('Car stored in Dante\'s Garage. It is yours now.', 3);
      sfx('pickup');
    } else showToast('This car is already yours.', 2);
    return;
  }
  showToast('No shop here. Find Ironworks Guns, Vest & Co., Burger Bay, Spray & Shine, or a payphone (see map).', 3.5);
}

function buyMenu(kind) {
  if (kind === 'gun') {
    // buy the cheapest weapon you do not own yet
    const order = ['smg', 'shotgun', 'rifle'];
    for (const name of order) {
      const w = WEAPONS[name];
      if (!S.weapons[name].owned) {
        if (S.cash >= w.price) {
          addCash(-w.price);
          S.weapons[name] = { ammo: w.mag, owned: true };
          S.weapon = name;
          showToast(`Bought ${w.name} for $${w.price}! Press 2/3/4 to use it.`, 3);
          sfx('cash');
        } else showToast(`${w.name} costs $${w.price} — you have $${Math.round(S.cash)}.`, 3);
        return;
      }
    }
    // all owned: buy ammo
    const cur = S.weapons[S.weapon];
    if (S.cash >= 100) { addCash(-100); cur.ammo += 120; showToast('Ammo restocked +120. -$100', 2); sfx('cash'); }
    else showToast('Ammo costs $100.', 2);
  }
  if (kind === 'armor') {
    if (S.player.armor >= 100) { showToast('Armor already full.', 2); return; }
    if (S.cash >= 200) { addCash(-200); S.player.armor = 100; showToast('Full body armor! -$200', 2); sfx('pickup'); }
    else showToast('Body armor costs $200.', 2);
  }
}

export function phoneAction() {
  if (S.wanted === 0) { showToast('No heat on you. The payphone is quiet.', 2); return; }
  const cost = S.wanted * 150;
  if (S.cash >= cost) {
    addCash(-cost);
    S.wantedHeat = 0; S.wanted = 0;
    S.cops.forEach(c => { c.givingUp = true; });
    showToast(`Bribe paid: -$${cost}. The cops lost interest... this time.`, 3);
    sfx('cash');
    say('CRUZ', 'That bribe bought you an hour, Rex. Do not waste it.');
  } else {
    showToast(`A bribe costs $${cost} at ${S.wanted} stars — you have $${Math.round(S.cash)}.`, 3);
  }
}
