/**
 * Catalogue DE DÉMONSTRATION : références, prix et règles d'accessoires FICTIFS.
 * Rien ici ne provient d'un vrai catalogue grossiste. La forme (produit × pose × gamme,
 * accessoires obligatoires, kits) est celle qu'un import du vrai catalogue devra produire.
 */

export const GAMMES = {
	eco: { label: "Éco", code: "ECO", mult: 0.8, marque: "Feller STANDARDdue" },
	standard: { label: "Standard", code: "STA", mult: 1, marque: "Feller EDIZIOdue" },
	premium: {
		label: "Premium",
		code: "PRE",
		mult: 1.6,
		marque: "Feller EDIZIOdue design",
	},
};
export const GAMMES_CLES = Object.keys(GAMMES);

export const POSES = { UP: "encastré", AP: "apparent" };

const GENERIQUE = "Marque distributeur (démo)";

/**
 * Un produit = une fonction métier. L'article réel = produit × pose × gamme.
 * - base : prix brut catalogue CHF/unité (nombre, ou {UP, AP} si le prix dépend de la pose)
 * - poses : poses possibles ; si > 1 et non précisée, le bot pose la question
 * - gammes : true → décliné Éco/Standard/Premium (multiplicateur sur `base`)
 * - alias : listes de mots (tous requis) ; `sauf` : mots qui excluent le produit
 * - requiert : accessoires obligatoires, par unité du produit (siPose : seulement pour cette pose)
 */
const PRODUITS_DEF = [
	{
		id: "prise_t13_simple",
		libelle: "Prise T13 simple",
		unite: "pce",
		base: { UP: 9.5, AP: 12 },
		poseMin: 12,
		poses: ["UP", "AP"],
		gammes: true,
		alias: [["prise"], ["t13"]],
		sauf: ["triple", "double", "t23", "four", "cuisiniere", "borne"],
		requiert: [
			{ id: "boite_encastrement", qte: 1, siPose: "UP" },
			{ id: "cadre", qte: 1 },
		],
	},
	{
		id: "prise_t13_double",
		libelle: "Prise T13 double",
		unite: "pce",
		base: 17.5,
		poseMin: 15,
		poses: ["UP"],
		gammes: true,
		alias: [
			["prise", "double"],
			["t13", "double"],
		],
		requiert: [
			{ id: "boite_encastrement", qte: 1 },
			{ id: "cadre", qte: 1 },
		],
	},
	{
		id: "prise_t13_triple",
		libelle: "Prise T13 triple",
		unite: "pce",
		base: 26,
		poseMin: 18,
		poses: ["UP"],
		gammes: true,
		alias: [
			["prise", "triple"],
			["t13", "triple"],
		],
		requiert: [
			{ id: "boite_encastrement", qte: 1 },
			{ id: "cadre", qte: 1 },
		],
	},
	{
		id: "prise_t23_four",
		libelle: "Prise T23 pour four/cuisinière",
		unite: "pce",
		base: 38,
		poseMin: 25,
		poses: ["UP"],
		gammes: true,
		alias: [["t23"], ["prise", "four"], ["prise", "cuisiniere"]],
		requiert: [
			{ id: "boite_encastrement", qte: 1 },
			{ id: "cadre", qte: 1 },
		],
	},
	{
		id: "interrupteur_simple",
		libelle: "Interrupteur simple",
		unite: "pce",
		base: { UP: 8.5, AP: 11 },
		poseMin: 12,
		poses: ["UP", "AP"],
		gammes: true,
		alias: [["interrupteur"]],
		sauf: ["vaetvient", "permutateur"],
		requiert: [
			{ id: "boite_encastrement", qte: 1, siPose: "UP" },
			{ id: "cadre", qte: 1 },
		],
	},
	{
		id: "interrupteur_va_et_vient",
		libelle: "Interrupteur va-et-vient",
		unite: "pce",
		base: { UP: 11.5, AP: 14 },
		poseMin: 15,
		poses: ["UP", "AP"],
		gammes: true,
		alias: [["vaetvient"], ["permutateur"]],
		requiert: [
			{ id: "boite_encastrement", qte: 1, siPose: "UP" },
			{ id: "cadre", qte: 1 },
		],
	},
	{
		id: "spot_led",
		libelle: "Spot LED encastré",
		unite: "pce",
		base: 22,
		poseMin: 15,
		gammes: true,
		alias: [["spot"], ["downlight"]],
	},
	{
		id: "cadre",
		libelle: "Cadre de finition 1 poste",
		unite: "pce",
		base: 3.2,
		poseMin: 1,
		gammes: true,
		alias: [],
	},
	{
		id: "boite_encastrement",
		libelle: "Boîte d'encastrement",
		unite: "pce",
		base: 1.8,
		poseMin: 5,
		marque: GENERIQUE,
		alias: [],
	},
	{
		id: "tube_m25",
		libelle: "Tube d'installation M25",
		unite: "m",
		base: 1.9,
		poseMin: 3,
		marque: GENERIQUE,
		alias: [["tube", "m25"], ["m25"]],
	},
	{
		id: "tube_m20",
		libelle: "Tube d'installation M20",
		unite: "m",
		base: 1.4,
		poseMin: 3,
		marque: GENERIQUE,
		alias: [["tube", "m20"], ["m20"]],
	},
	{
		id: "tube_m16",
		libelle: "Tube d'installation M16",
		unite: "m",
		base: 1.1,
		poseMin: 3,
		marque: GENERIQUE,
		alias: [["tube", "m16"], ["m16"]],
	},
	{
		id: "cable_3x1.5",
		libelle: "Câble 3×1.5 mm²",
		unite: "m",
		base: 1.35,
		poseMin: 2,
		marque: GENERIQUE,
		alias: [["3x1.5"]],
	},
	{
		id: "cable_3x2.5",
		libelle: "Câble 3×2.5 mm²",
		unite: "m",
		base: 2.1,
		poseMin: 2,
		marque: GENERIQUE,
		alias: [["3x2.5"]],
	},
	{
		id: "cable_5x1.5",
		libelle: "Câble 5×1.5 mm²",
		unite: "m",
		base: 1.9,
		poseMin: 2,
		marque: GENERIQUE,
		alias: [["5x1.5"]],
	},
	{
		id: "cable_5x2.5",
		libelle: "Câble 5×2.5 mm²",
		unite: "m",
		base: 2.9,
		poseMin: 2,
		marque: GENERIQUE,
		alias: [["5x2.5"]],
	},
	{
		id: "cable_5x6",
		libelle: "Câble 5×6 mm²",
		unite: "m",
		base: 7.8,
		poseMin: 3,
		marque: GENERIQUE,
		alias: [["5x6"]],
	},
	{
		id: "disjoncteur_b16",
		libelle: "Disjoncteur B16 1P",
		unite: "pce",
		base: 13,
		poseMin: 8,
		marque: GENERIQUE,
		alias: [["disjoncteur", "b16"], ["b16"]],
	},
	{
		id: "disjoncteur_3p_c16",
		libelle: "Disjoncteur C16 3P",
		unite: "pce",
		base: 48,
		poseMin: 10,
		marque: GENERIQUE,
		alias: [["disjoncteur", "c16"], ["c16"]],
	},
	{
		id: "fi_30ma",
		libelle: "Interrupteur différentiel 30 mA",
		unite: "pce",
		base: 62,
		poseMin: 10,
		marque: GENERIQUE,
		alias: [["fi"], ["differentiel"]],
		sauf: ["b"],
	},
	{
		id: "fi_type_b",
		libelle: "Interrupteur différentiel type B 30 mA",
		unite: "pce",
		base: 185,
		poseMin: 12,
		marque: GENERIQUE,
		alias: [
			["fi", "b"],
			["differentiel", "b"],
		],
	},
	{
		id: "borne_irve_11kw",
		libelle: "Borne de recharge 11 kW",
		unite: "pce",
		base: 890,
		poseMin: 90,
		marque: "Wallbox (démo)",
		alias: [["borne"], ["wallbox"], ["irve"]],
	},
];

export const KITS = [
	{
		id: "kit_borne",
		libelle: "Kit borne de recharge 11 kW",
		alias: [
			["kit", "borne"],
			["pack", "borne"],
		],
		composants: [
			{ id: "borne_irve_11kw", qte: 1 },
			{ id: "cable_5x6", qte: 25 },
			{ id: "disjoncteur_3p_c16", qte: 1 },
			{ id: "fi_type_b", qte: 1 },
		],
	},
	{
		id: "kit_cuisine",
		libelle: "Kit cuisine",
		alias: [
			["kit", "cuisine"],
			["pack", "cuisine"],
		],
		composants: [
			{ id: "prise_t23_four", qte: 1 },
			{ id: "prise_t13_double", qte: 3 },
			{ id: "spot_led", qte: 4 },
		],
	},
];

export const PRODUITS = new Map(PRODUITS_DEF.map((p) => [p.id, p]));

/**
 * Produit du catalogue démo, sinon produit ajouté par l'utilisateur (stocké dans le devis :
 * `devis.produitsPerso`, cf. perso.js). Toujours passer par ici plutôt que par PRODUITS.get.
 */
export const produitDe = (devis, id) =>
	PRODUITS.get(id) ?? devis.produitsPerso?.find((p) => p.id === id);

const r2 = (x) => Math.round(x * 100) / 100;

/** Pose effective : la pose imposée si le produit n'en admet qu'une, sinon celle choisie (ou null). */
export function poseEffective(produit, pose) {
	if (!produit.poses?.length) return null;
	if (produit.poses.length === 1) return produit.poses[0];
	return produit.poses.includes(pose) ? pose : null;
}

export const doitPreciserPose = (produit, pose) =>
	(produit.poses?.length ?? 0) > 1 && !produit.poses.includes(pose);

/** Article réel (référence, libellé, prix brut) pour un produit × pose × gamme. */
export function article(produit, pose, gamme) {
	const g = produit.gammes ? gamme : null;
	const p = poseEffective(produit, pose);
	const base = typeof produit.base === "number" ? produit.base : produit.base[p];
	const ref = [
		!produit.perso && "DEMO", // un produit ajouté a déjà « PERSO-n » dans son id
		produit.id.toUpperCase().replace(/[^A-Z0-9]+/g, "-"),
		p,
		g && GAMMES[g].code,
	]
		.filter(Boolean)
		.join("-");
	return {
		ref,
		libelle: p ? `${produit.libelle} (${p})` : produit.libelle,
		marque: g ? GAMMES[g].marque : produit.marque,
		gamme: g,
		unite: produit.unite,
		brut: r2(base * (g ? GAMMES[g].mult : 1)),
	};
}

const REFS = new Map();
for (const produit of PRODUITS.values()) {
	for (const pose of produit.poses?.length ? produit.poses : [null]) {
		for (const gamme of produit.gammes ? GAMMES_CLES : [null]) {
			REFS.set(article(produit, pose, gamme).ref, {
				produitId: produit.id,
				pose,
				gamme,
			});
		}
	}
}

/** Référence → { produitId, pose, gamme }, ou undefined si inconnue. */
export const parseRef = (ref) => REFS.get(ref);
