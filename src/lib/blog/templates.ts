import type { BlogBlock } from "./types";

/** Reusable answers / snippets that can be dropped into any article. */
export interface BlockTemplate {
  id: string;
  group: "Ответы" | "Фитмент" | "CTA" | "Структура";
  title: string;
  blocks: BlogBlock[];
  custom?: boolean;
}

export const BUILTIN_TEMPLATES: BlockTemplate[] = [
  {
    id: "faq-lead-time",
    group: "Ответы",
    title: "Сроки производства",
    blocks: [
      { type: "h", text: "How long does a forged set take?" },
      {
        type: "p",
        text: "Every DRAXLER set is made to order. Design approval and 3D fitment rendering take 3–5 working days, production 4–6 weeks, and air delivery with customs clearance a further 10–15 days.",
      },
    ],
  },
  {
    id: "faq-warranty",
    group: "Ответы",
    title: "Гарантия",
    blocks: [
      { type: "h", text: "Warranty" },
      {
        type: "p",
        text: "All forged DRAXLER wheels carry a lifetime structural warranty, guaranteed fitment for the specified vehicle and certified balance and roundness.",
      },
    ],
  },
  {
    id: "faq-shipping",
    group: "Ответы",
    title: "Доставка и оплата",
    blocks: [
      { type: "h", text: "Shipping & payment" },
      {
        type: "list",
        items: [
          "Express delivery via DHL, UPS, TNT or FedEx.",
          "Air shipping (10–15 days) with customs clearance included.",
          "Sea shipping (25–45 days) for selected destinations.",
          "Payment by bank wire (SWIFT), PayPal or card.",
        ],
      },
    ],
  },
  {
    id: "faq-materials",
    group: "Ответы",
    title: "Материалы 6061‑T6",
    blocks: [
      {
        type: "p",
        text: "Our forged blanks are made from aerospace-grade 6061-T6 aluminium, compressed under up to 12,000 tonnes. The aligned grain structure delivers the highest strength-to-weight ratio available — typically 20–30% lighter than an equivalent cast wheel.",
      },
    ],
  },
  {
    id: "fit-gwagon",
    group: "Фитмент",
    title: "Таблица: G‑Class",
    blocks: [
      {
        type: "specs",
        title: "Mercedes-Benz G-Class — reference fitment",
        rows: [
          ["Bolt pattern", "5×130"],
          ["Centre bore", "84.1 mm, hub-centric"],
          ["Recommended size", "23×10.5J ET30–35"],
          ["Tyre", "295/35 R23"],
        ],
      },
    ],
  },
  {
    id: "fit-empty",
    group: "Фитмент",
    title: "Пустая таблица фитмента",
    blocks: [
      {
        type: "specs",
        title: "Reference fitment",
        rows: [
          ["Bolt pattern", ""],
          ["Centre bore", ""],
          ["Size", ""],
          ["Offset", ""],
        ],
      },
    ],
  },
  {
    id: "cta-configurator",
    group: "CTA",
    title: "Призыв: конфигуратор",
    blocks: [
      {
        type: "p",
        text: "You can explore every compatible DRAXLER design on the interactive 3D configurator and request a tailored fitment proposal in a few clicks.",
      },
    ],
  },
  {
    id: "cta-quote",
    group: "CTA",
    title: "Цитата команды",
    blocks: [
      {
        type: "quote",
        text: "The goal was never to make the car look modified. It was to make it look finished.",
        cite: "DRAXLER design team",
      },
    ],
  },
  {
    id: "struct-review",
    group: "Структура",
    title: "Обзор нового авто",
    blocks: [
      { type: "p", text: "Intro — what the car is and why it matters." },
      { type: "h", text: "Design" },
      { type: "p", text: "" },
      { type: "h", text: "Performance" },
      {
        type: "specs",
        title: "Key figures",
        rows: [
          ["Power", ""],
          ["0–100 km/h", ""],
          ["Top speed", ""],
        ],
      },
      { type: "h", text: "The DRAXLER view" },
      { type: "p", text: "How we would approach wheel fitment on this platform." },
    ],
  },
  {
    id: "struct-project",
    group: "Структура",
    title: "Кейс проекта",
    blocks: [
      { type: "p", text: "The vehicle and the client brief." },
      { type: "h", text: "The challenge" },
      { type: "p", text: "" },
      { type: "h", text: "The solution" },
      { type: "p", text: "" },
      {
        type: "specs",
        title: "Final specification",
        rows: [
          ["Wheel", ""],
          ["Size", ""],
          ["Finish", ""],
        ],
      },
    ],
  },
];
