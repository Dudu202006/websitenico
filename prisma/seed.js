import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.ligneCommande.deleteMany();
  await prisma.commande.deleteMany();
  await prisma.recetteMagasin.deleteMany();
  await prisma.recetteIngredient.deleteMany();
  await prisma.recette.deleteMany();
  await prisma.evenementProduction.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.inventaireMagasin.deleteMany();
  await prisma.stockProductionProduit.deleteMany();
  await prisma.stockProductionMarchandise.deleteMany();
  await prisma.user.deleteMany();
  await prisma.produit.deleteMany();
  await prisma.marchandise.deleteMany();
  await prisma.magasin.deleteMany();

  const password = await bcrypt.hash('demo123', 10);

  const magasinBenAhin = await prisma.magasin.create({
    data: {
      nom: 'Ben ahin',
      adresse: '5 Chaussée de Dinant, 4500 Huy',
      telephone: '085 61 61 11',
    },
  });

  const magasinThiange = await prisma.magasin.create({
    data: {
      nom: 'Thiange',
      adresse: '73 Rue des Bons Enfants, 4500 Huy',
      telephone: '085 21 33 98',
    },
  });

  const produits = await Promise.all([
    prisma.produit.create({
      data: {
        nom: 'Baguette tradition',
        description: 'Baguette croustillante au levain',
        categorie: 'Pain',
        prix: 1.2,
        unite: 'pièce',
      },
    }),
    prisma.produit.create({
      data: {
        nom: 'Croissant au beurre',
        description: 'Viennoiserie pur beurre AOP',
        categorie: 'Viennoiserie',
        prix: 1.4,
        unite: 'pièce',
      },
    }),
    prisma.produit.create({
      data: {
        nom: 'Pain complet',
        description: 'Pain aux céréales complètes',
        categorie: 'Pain',
        prix: 3.5,
        unite: 'pièce',
      },
    }),
    prisma.produit.create({
      data: {
        nom: 'Tarte aux pommes',
        description: 'Tarte maison aux pommes golden',
        categorie: 'Pâtisserie',
        prix: 18,
        unite: 'pièce',
      },
    }),
  ]);

  const marchandises = await Promise.all([
    prisma.marchandise.create({
      data: {
        nom: 'Farine T55',
        description: 'Farine de blé pour pains',
        categorie: 'Farine',
        unite: 'kg',
      },
    }),
    prisma.marchandise.create({
      data: {
        nom: 'Beurre AOP',
        description: 'Beurre de baratte',
        categorie: 'Matière grasse',
        unite: 'kg',
      },
    }),
    prisma.marchandise.create({
      data: {
        nom: 'Levure boulangère',
        description: 'Levure fraîche',
        categorie: 'Levure',
        unite: 'kg',
      },
    }),
  ]);

  for (const produit of produits) {
    await prisma.stockProductionProduit.create({
      data: { produitId: produit.id, quantite: 100, seuilAlerte: 20 },
    });
  }

  for (const marchandise of marchandises) {
    await prisma.stockProductionMarchandise.create({
      data: { marchandiseId: marchandise.id, quantite: 50, seuilAlerte: 10 },
    });
  }

  for (const magasin of [magasinBenAhin, magasinThiange]) {
    for (const produit of produits) {
      await prisma.inventaireMagasin.create({
        data: {
          magasinId: magasin.id,
          produitId: produit.id,
          quantite: Math.floor(Math.random() * 30) + 5,
          seuilAlerte: 10,
        },
      });
    }
  }

  await prisma.user.createMany({
    data: [
      {
        email: 'admin@delice.fr',
        password,
        nom: 'Administrateur',
        role: 'ADMIN',
      },
      {
        email: 'benahin@delice.fr',
        password,
        nom: 'Responsable Ben ahin',
        role: 'MAGASIN',
        magasinId: magasinBenAhin.id,
      },
      {
        email: 'thiange@delice.fr',
        password,
        nom: 'Responsable Thiange',
        role: 'MAGASIN',
        magasinId: magasinThiange.id,
      },
      {
        email: 'production@delice.fr',
        password,
        nom: 'Chef de production',
        role: 'PRODUCTION',
      },
    ],
  });

  const commande = await prisma.commande.create({
    data: {
      numero: 'CMD-2026-0001',
      magasinId: magasinBenAhin.id,
      statut: 'EN_ATTENTE',
      notes: 'Livraison matinale souhaitée',
      lignes: {
        create: [
          { produitId: produits[0].id, quantite: 50 },
          { produitId: produits[1].id, quantite: 30 },
        ],
      },
    },
  });

  await prisma.recette.create({
    data: {
      nom: 'Baguette tradition',
      description: 'Baguette croustillante au levain',
      instructions: 'Pétrir 8 min, pointer 1h, façonner, cuire 25 min à 240 °C.',
      allergenes: ['Gluten'],
      portionsBase: 20,
      unitePortion: 'pièces',
      ingredients: {
        create: [
          { nom: 'Farine T55', quantiteValeur: 1, quantiteUnite: 'kg', quantite: '1 kg' },
          { nom: 'Levure boulangère', quantiteValeur: 20, quantiteUnite: 'g', quantite: '20 g' },
          { nom: 'Sel', quantiteValeur: 18, quantiteUnite: 'g', quantite: '18 g' },
        ],
      },
      partages: {
        create: [{ magasinId: magasinBenAhin.id }, { magasinId: magasinThiange.id }],
      },
    },
  });

  await prisma.recette.create({
    data: {
      nom: 'Croissant au beurre',
      description: 'Viennoiserie pur beurre AOP',
      instructions: 'Tourage 3 simples, repos au froid entre chaque tour.',
      allergenes: ['Gluten', 'Lactose', 'Œufs'],
      portionsBase: 24,
      unitePortion: 'pièces',
      ingredients: {
        create: [
          { nom: 'Farine T45', quantiteValeur: 500, quantiteUnite: 'g', quantite: '500 g' },
          { nom: 'Beurre AOP', quantiteValeur: 250, quantiteUnite: 'g', quantite: '250 g' },
          { nom: 'Lait', quantiteValeur: 250, quantiteUnite: 'ml', quantite: '250 ml' },
        ],
      },
      partages: {
        create: [{ magasinId: magasinBenAhin.id }],
      },
    },
  });

  await prisma.recette.create({
    data: {
      nom: 'Pain aux noix',
      description: 'Pain complet aux noix du Périgord',
      instructions: 'Incorporer les noix après le premier pointage.',
      allergenes: ['Gluten', 'Fruits à coque'],
      portionsBase: 4,
      unitePortion: 'pièces',
      ingredients: {
        create: [
          { nom: 'Farine complète', quantiteValeur: 800, quantiteUnite: 'g', quantite: '800 g' },
          { nom: 'Noix', quantiteValeur: 200, quantiteUnite: 'g', quantite: '200 g' },
        ],
      },
      partages: {
        create: [{ magasinId: magasinThiange.id }],
      },
    },
  });

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  await prisma.evenementProduction.createMany({
    data: [
      {
        titre: 'Congés équipe',
        description: 'Fermeture atelier — équipe en congé',
        type: 'CONGE',
        couleur: '#4A90D9',
        dateDebut: new Date(year, month, 12),
        dateFin: new Date(year, month, 14, 23, 59, 59),
        jourEntier: true,
      },
      {
        titre: 'RDV fournisseur farine',
        description: 'Rencontre avec le moulin local',
        type: 'RDV',
        couleur: '#E67E22',
        dateDebut: new Date(year, month, 5, 10, 0),
        dateFin: new Date(year, month, 5, 11, 30),
        jourEntier: false,
      },
      {
        titre: 'Production croissants',
        description: 'Tournée matinale — 200 pièces',
        type: 'PRODUCTION',
        couleur: '#8B6914',
        dateDebut: new Date(year, month, 8, 4, 0),
        dateFin: new Date(year, month, 8, 8, 0),
        jourEntier: false,
      },
      {
        titre: 'Livraison Ben ahin',
        description: 'Tournée magasin matin',
        type: 'LIVRAISON',
        couleur: '#9B59B6',
        dateDebut: new Date(year, month, 15, 7, 0),
        dateFin: new Date(year, month, 15, 9, 0),
        jourEntier: false,
      },
    ],
  });

  console.log('Base de données initialisée avec succès.');
  console.log('Comptes de démonstration (mot de passe: demo123):');
  console.log('- admin@delice.fr (Admin)');
  console.log('- benahin@delice.fr (Magasin Ben ahin)');
  console.log('- thiange@delice.fr (Magasin Thiange)');
  console.log('- production@delice.fr (Production)');
  console.log(`Commande exemple: ${commande.numero}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
