/* Mirrors the live site posts (aero/src/lib/blog-data.ts) — the starting state of the editor. */
import type { SeedPost } from "./types";

export const SEED_POSTS: SeedPost[] = [
  {
    slug: "inside-the-draxler-g-wagon-study",
    title: "Inside the DRAXLER G‑Wagon Study",
    excerpt:
      "How we engineered three forged designs around the most recognisable silhouette in the luxury SUV world — and why offset mattered more than diameter.",
    category: "DRAXLER Projects",
    tags: ["Mercedes-Benz", "G-Class", "Forged"],
    date: "2026-10-14",
    author: "DRAXLER Studio",
    readTime: "5 min read",
    cover: "/projects/g-wagon-green.jpg",
    body: [
      {
        type: "p",
        text: "The G-Class is one of very few vehicles that has kept its shape for more than four decades. That makes it a uniquely difficult canvas for a wheel designer: the slab sides, upright glasshouse and exposed spare wheel leave nowhere to hide a poorly judged fitment.",
      },
      {
        type: "p",
        text: "Our G-Wagon study started with a simple question — what does the car look like when the wheel fills the arch the way the designers drew it, rather than the way the homologation process allows it?",
      },
      { type: "h", text: "Offset before diameter" },
      {
        type: "p",
        text: "Most G-Class upgrades jump straight to 23 or 24 inches. We began with offset instead. The factory 22×10J wheel sits at ET36, leaving a visible gap between tyre shoulder and fender. Moving to 23×10.5J at ET30–35 brings the outer lip forward by seven to twelve millimetres while keeping the inner barrel almost exactly where it was — so suspension and steering clearance remain unchanged.",
      },
      {
        type: "specs",
        title: "G-Wagon study — reference fitment",
        rows: [
          ["Bolt pattern", "5×130"],
          ["Centre bore", "84.1 mm, hub-centric"],
          ["Recommended size", "23×10.5J ET30–35"],
          ["Tyre", "295/35 R23"],
          ["Load rating", "≥ 1,040 kg per wheel"],
        ],
      },
      { type: "h", text: "Three characters, one platform" },
      {
        type: "p",
        text: "DRX-101 brings a forged mesh that echoes the G-Class’ grille. DRX-213 adds a sculpted, directional face for a more athletic stance, while DRX-305 explores a deep concave profile that reads clearly even from across the street. Each was checked against AMG G 63 caliper templates before a single billet was cut.",
      },
      {
        type: "quote",
        text: "The goal was never to make the G-Class look modified. It was to make it look finished.",
        cite: "DRAXLER design team",
      },
      {
        type: "p",
        text: "You can explore every compatible DRAXLER design on the interactive G-Wagon model in our Projects section, together with the full fitment guide.",
      },
    ],
  },
  {
    slug: "forged-flow-formed-or-cast",
    title: "Forged, Flow‑Formed or Cast: What Actually Changes",
    excerpt:
      "Three manufacturing methods, three very different wheels. We break down strength, weight and cost so you know exactly what you are paying for.",
    category: "Wheel Tech",
    tags: ["Forged", "Engineering", "Guide"],
    date: "2026-10-06",
    author: "DRAXLER Engineering",
    readTime: "6 min read",
    cover: "/media/background_2.jpg",
    body: [
      {
        type: "p",
        text: "Two wheels can share the same design, size and finish and still behave completely differently on the road. The difference is how the aluminium was turned into a wheel in the first place.",
      },
      { type: "h", text: "Cast" },
      {
        type: "p",
        text: "Molten aluminium is poured or pressure-fed into a mould. Casting is fast and affordable, which is why it is used for the vast majority of factory wheels. The trade-off is a less uniform grain structure and the possibility of microscopic porosity, so cast wheels need more material — and therefore more weight — to reach the same strength.",
      },
      { type: "h", text: "Flow-formed" },
      {
        type: "p",
        text: "A cast face is combined with a barrel that is heated, spun and stretched over a mandrel under pressure. The barrel’s grain is compressed, making it stronger and thinner. Flow-forming is a sensible middle ground: lighter than cast, but the face remains a casting.",
      },
      { type: "h", text: "Forged" },
      {
        type: "p",
        text: "A solid billet of aerospace-grade 6061-T6 aluminium is compressed under thousands of tonnes of pressure, aligning the grain with the shape of the wheel. The forged blank is then CNC-machined into its final design. The result is the highest strength-to-weight ratio available, typically 20–30% lighter than an equivalent cast wheel.",
      },
      {
        type: "specs",
        title: "At a glance",
        rows: [
          ["Cast", "Heaviest · lowest cost · factory standard"],
          ["Flow-formed", "Lighter barrel · cast face · mid-range"],
          ["Forged monoblock", "Lightest · strongest · fully bespoke"],
          ["Forged 2/3-piece", "Modular · custom widths and offsets"],
        ],
      },
      { type: "h", text: "Why weight matters twice" },
      {
        type: "p",
        text: "Wheels are unsprung, rotating mass. Every kilogram saved reduces the inertia the engine and brakes must overcome and lets the suspension react faster to the road. On a heavy SUV that means sharper turn-in and better ride quality; on a sports car it is measurable on a lap time.",
      },
      {
        type: "list",
        items: [
          "Choose forged when you want the lowest weight and a truly custom size or offset.",
          "Choose flow-formed when budget matters but you still want a step up from factory.",
          "Always check the load rating — especially on SUVs above 2,500 kg.",
        ],
      },
    ],
  },
  {
    slug: "ferrari-f80-hypercar",
    title: "Ferrari F80: Maranello’s New Hypercar Benchmark",
    excerpt:
      "1,200 cv from a hybrid V6, active aerodynamics and just 799 examples. A closer look at the car that succeeds LaFerrari.",
    category: "New Cars",
    tags: ["Ferrari", "Hypercar", "Hybrid"],
    date: "2026-09-28",
    author: "DRAXLER Editorial",
    readTime: "4 min read",
    cover: "/blog/ferrari-f80.jpg",
    credit: "Photo: Calreyn88 / Wikimedia Commons, CC BY-SA 4.0",
    body: [
      {
        type: "p",
        text: "Ferrari builds a hypercar roughly once a decade, and each one becomes a reference point for its era. The F80 follows the 288 GTO, F40, F50, Enzo and LaFerrari — and it is the most technically ambitious of them all.",
      },
      { type: "h", text: "A V6 with Le Mans DNA" },
      {
        type: "p",
        text: "Instead of a V12, the F80 uses a 3.0-litre twin-turbocharged V6 derived from the 499P that won at Le Mans. Combined with three electric motors — two on the front axle and one at the rear — total output reaches 1,200 cv, making it the most powerful road-going Ferrari ever built.",
      },
      {
        type: "specs",
        title: "Ferrari F80 — key figures",
        rows: [
          ["Powertrain", "3.0 V6 twin-turbo + 3 e-motors"],
          ["Total output", "1,200 cv"],
          ["0–100 km/h", "2.15 s"],
          ["0–200 km/h", "5.75 s"],
          ["Top speed", "350 km/h"],
          ["Production", "799 cars"],
        ],
      },
      { type: "h", text: "Aerodynamics first" },
      {
        type: "p",
        text: "The body is shaped around an S-Duct at the front and an active rear wing, together generating up to 1,050 kg of downforce at 250 km/h. Active suspension keeps the platform stable, allowing the car to run a ride height that would be impossible with conventional dampers.",
      },
      {
        type: "p",
        text: "For wheel designers, the F80 is a lesson in integration: brake cooling, airflow and unsprung weight are treated as part of the aerodynamic package rather than an afterthought.",
      },
    ],
  },
  {
    slug: "lamborghini-temerario",
    title: "Lamborghini Temerario: The 10,000 rpm Successor",
    excerpt:
      "The Huracán’s replacement trades the naturally aspirated V10 for a twin-turbo hybrid V8 that revs to five figures.",
    category: "New Cars",
    tags: ["Lamborghini", "Supercar", "Hybrid"],
    date: "2026-09-16",
    author: "DRAXLER Editorial",
    readTime: "4 min read",
    cover: "/blog/lamborghini-temerario.jpg",
    credit: "Photo: Calreyn88 / Wikimedia Commons, CC BY-SA 4.0",
    body: [
      {
        type: "p",
        text: "Replacing the Huracán — Lamborghini’s most successful V10 car — was never going to be simple. The Temerario answers with a completely new powertrain and a promise that electrification will not dull the drama.",
      },
      { type: "h", text: "A V8 that behaves like an atmospheric engine" },
      {
        type: "p",
        text: "At the heart of the car is a new 4.0-litre twin-turbo V8 producing 800 cv on its own, with a flat-plane crankshaft and a redline of 10,000 rpm. Three electric motors lift the combined figure to 920 cv and give the Temerario all-wheel drive with torque vectoring at the front axle.",
      },
      {
        type: "specs",
        title: "Lamborghini Temerario — key figures",
        rows: [
          ["Engine", "4.0 V8 twin-turbo HPEV"],
          ["Combined output", "920 cv"],
          ["Redline", "10,000 rpm"],
          ["0–100 km/h", "2.7 s"],
          ["Top speed", "343 km/h"],
          ["Gearbox", "8-speed dual-clutch"],
        ],
      },
      { type: "h", text: "Design and stance" },
      {
        type: "p",
        text: "The hexagonal theme runs from the headlight signature to the exhausts, and the optional Alleggerita package strips weight with carbon-fibre aero parts. A staggered wheel set and wide rear track give the car the low, planted stance that defines a modern Lamborghini.",
      },
    ],
  },
  {
    slug: "bmw-m5-g90-hybrid",
    title: "BMW M5 G90: The Hybrid Super Saloon",
    excerpt:
      "727 hp, 1,000 Nm and a plug-in hybrid V8. The seventh-generation M5 redefines what a business saloon can do.",
    category: "New Cars",
    tags: ["BMW", "M Performance", "Saloon"],
    date: "2026-09-02",
    author: "DRAXLER Editorial",
    readTime: "4 min read",
    cover: "/blog/bmw-m5.jpg",
    credit: "Photo: Alexander Migl / Wikimedia Commons, CC BY-SA 4.0",
    body: [
      {
        type: "p",
        text: "For four decades the M5 has been the benchmark for fast four-door cars. The G90 generation takes its biggest step yet by pairing BMW’s 4.4-litre twin-turbo V8 with an electric motor integrated into the eight-speed M Steptronic gearbox.",
      },
      {
        type: "specs",
        title: "BMW M5 (G90) — key figures",
        rows: [
          ["Powertrain", "4.4 V8 twin-turbo plug-in hybrid"],
          ["System output", "727 hp / 535 kW"],
          ["System torque", "1,000 Nm"],
          ["0–100 km/h", "3.5 s"],
          ["Wheels", "20″ front / 21″ rear"],
          ["Body styles", "Saloon & Touring"],
        ],
      },
      { type: "h", text: "Mixed-size wheels as standard" },
      {
        type: "p",
        text: "Like the latest M3 and M4, the new M5 runs a staggered setup: 20-inch wheels at the front and 21-inch at the rear. It sharpens turn-in and gives the car a purposeful rake — but it also means any aftermarket set needs individually engineered front and rear offsets.",
      },
      {
        type: "p",
        text: "With a kerb weight approaching 2.5 tonnes, load rating becomes a key part of the brief. Forged wheels allow us to meet that requirement while still removing several kilograms of unsprung mass per corner.",
      },
    ],
  },
  {
    slug: "mercedes-g580-eq-technology",
    title: "The Electric G: Mercedes G 580 with EQ Technology",
    excerpt:
      "Four motors, 1,164 Nm and a G-Turn that spins the car on the spot. The G-Class goes electric without losing its off-road credentials.",
    category: "New Cars",
    tags: ["Mercedes-Benz", "G-Class", "Electric"],
    date: "2026-08-21",
    author: "DRAXLER Editorial",
    readTime: "5 min read",
    cover: "/blog/mercedes-g580.jpg",
    credit: "Photo: Alexander-93 / Wikimedia Commons, CC BY-SA 4.0",
    body: [
      {
        type: "p",
        text: "Few vehicles are as closely tied to the combustion engine as the G-Class. Yet the G 580 with EQ Technology proves the formula works without one — and in some situations works better.",
      },
      { type: "h", text: "One motor per wheel" },
      {
        type: "p",
        text: "Four individually controlled electric motors produce a combined 587 hp and 1,164 Nm. Because each wheel can be driven independently, the G 580 can perform a G-Turn — rotating on its own axis — and G-Steering, which tightens the turning circle off-road.",
      },
      {
        type: "specs",
        title: "G 580 with EQ Technology — key figures",
        rows: [
          ["Motors", "4 (one per wheel)"],
          ["Output", "432 kW / 587 hp"],
          ["Torque", "1,164 Nm"],
          ["Battery", "116 kWh"],
          ["0–100 km/h", "4.7 s"],
          ["Wading depth", "850 mm"],
        ],
      },
      { type: "h", text: "What it means for wheels" },
      {
        type: "p",
        text: "The electric G keeps the familiar 5×130 bolt pattern, but its weight and instant torque make load rating and wheel stiffness even more important. Aerodynamic wheel faces also have a measurable effect on range — an area where forged, closed-spoke designs can help.",
      },
    ],
  },
  {
    slug: "porsche-911-carrera-gts-t-hybrid",
    title: "Porsche 911 Carrera GTS: The First Hybrid 911",
    excerpt:
      "An electric turbocharger, 541 PS and no compromise in weight. How Porsche electrified its icon the motorsport way.",
    category: "New Cars",
    tags: ["Porsche", "911", "Hybrid"],
    date: "2026-08-07",
    author: "DRAXLER Editorial",
    readTime: "4 min read",
    cover: "/blog/porsche-911-gts.jpg",
    credit: "Photo: Calreyn88 / Wikimedia Commons, CC BY-SA 4.0",
    body: [
      {
        type: "p",
        text: "The facelifted 992.2 generation introduced something many enthusiasts thought they would never see: a hybrid 911. Porsche’s T-Hybrid system, however, is designed for performance rather than electric-only driving.",
      },
      { type: "h", text: "An electric turbo" },
      {
        type: "p",
        text: "A new 3.6-litre flat-six uses a single electrically driven turbocharger that spools instantly, eliminating lag. A compact electric motor in the eight-speed PDK adds torque from rest. Together they deliver 541 PS and 610 Nm, while the high-voltage system adds only around 50 kg.",
      },
      {
        type: "specs",
        title: "911 Carrera GTS T-Hybrid — key figures",
        rows: [
          ["Engine", "3.6 flat-six, electric turbocharger"],
          ["System output", "541 PS"],
          ["System torque", "610 Nm"],
          ["0–100 km/h", "3.0 s"],
          ["Top speed", "312 km/h"],
          ["Wheels", "20″ front / 21″ rear"],
        ],
      },
      {
        type: "p",
        text: "With a staggered 20/21-inch setup and centre-lock options across the range, the 911 remains one of the most rewarding platforms for a lightweight forged wheel.",
      },
    ],
  },
  {
    slug: "how-to-read-a-fitment-guide",
    title: "How to Read a Wheel Fitment Guide",
    excerpt:
      "PCD, centre bore, offset and load rating explained in plain English — the four numbers that decide whether a wheel really fits.",
    category: "Wheel Tech",
    tags: ["Fitment", "Guide", "Offset"],
    date: "2026-07-24",
    author: "DRAXLER Engineering",
    readTime: "5 min read",
    cover: "/hero/hero1.jpg",
    body: [
      {
        type: "p",
        text: "Every DRAXLER project page includes a fitment guide. The tables look technical, but they come down to four numbers. Understand these and you can judge almost any wheel listing in seconds.",
      },
      { type: "h", text: "1. Bolt pattern (PCD)" },
      {
        type: "p",
        text: "Written as “5×130”, it means five bolts on a 130 mm circle. It must match your hub exactly — there is no tolerance. Adapters exist, but they add width and are not something we recommend on high-performance vehicles.",
      },
      { type: "h", text: "2. Centre bore" },
      {
        type: "p",
        text: "The diameter of the hole in the middle of the wheel. A hub-centric wheel matches the hub (84.1 mm on a G-Class), so the hub carries the load and the wheel runs perfectly true. Larger bores require centring rings.",
      },
      { type: "h", text: "3. Width and offset (ET)" },
      {
        type: "p",
        text: "Offset is the distance between the wheel’s mounting face and its centreline. A lower ET pushes the wheel outwards; a higher ET pulls it in. Together with width, offset decides whether the tyre sits flush with the fender, rubs the arch or hits the suspension.",
      },
      {
        type: "specs",
        title: "Rule of thumb",
        rows: [
          ["−5 mm ET", "Wheel moves 5 mm outward"],
          ["+0.5″ width", "≈ 6.35 mm more each side"],
          ["Flush target", "0–5 mm inside the fender lip"],
          ["Diameter change", "Keep within ±3% rolling diameter"],
        ],
      },
      { type: "h", text: "4. Load rating" },
      {
        type: "p",
        text: "Each wheel must support a share of the vehicle’s gross weight with a safety margin. We use gross vehicle weight × 1.3 ÷ 4 as the minimum. On heavy SUVs and EVs, this is often the number that rules out cheaper wheels.",
      },
      {
        type: "list",
        items: [
          "Start from the factory specification for your exact model year.",
          "Measure your own fender clearance — suspension height varies.",
          "Ask for a 3D fitment render before production.",
        ],
      },
    ],
  },
];
