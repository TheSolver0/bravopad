import { Reward } from './types';

// MOCK_REWARDS — utilisé uniquement par la boutique (données statiques, pas en DB)
export const MOCK_REWARDS: Reward[] = [
  {
    id: 'r1',
    title: 'Bon Amazon 20€',
    description: "Valable sur tout le catalogue Amazon.fr sans minimum d'achat.",
    cost: 2000,
    image: 'https://picsum.photos/seed/amazon/400/300',
    category: 'vouchers',
  },
  {
    id: 'r2',
    title: 'Ticket Cinéma Duo',
    description: 'Deux places valables dans tous les cinémas Gaumont et Pathé.',
    cost: 1500,
    image: 'https://picsum.photos/seed/cinema/400/300',
    category: 'tickets',
  },
  {
    id: 'r3',
    title: 'Journée de congé',
    description: 'Prenez une journée pour vous, entièrement rémunérée. Bravo !',
    cost: 5000,
    image: 'https://picsum.photos/seed/vacation/400/300',
    category: 'experiences',
  },
  {
    id: 'r4',
    title: 'Casque Bose QC',
    description: 'Réduction de bruit premium pour un focus total au bureau.',
    cost: 12000,
    image: 'https://picsum.photos/seed/headphones/400/300',
    category: 'equipment',
  },
];
