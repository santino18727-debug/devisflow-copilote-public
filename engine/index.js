import { GAMMES } from "./catalogue.js";
import {
	appliquerAction,
	calculerVue,
	commandeCsv,
	ErreurMetier,
	normaliserDevis,
	syncAccessoires,
} from "./devis.js";
import { interpreter } from "./interpreteur.js";

export { commandeCsv, ErreurMetier, normaliserDevis };

/** Format monétaire suisse : 1'234.50 */
export const chf = (x) =>
	x
		.toFixed(2)
		.replace(/\B(?=(\d{3})+(?!\d))/g, "'");

/**
 * Point d'entrée unique du moteur (même contrat que l'ancienne API HTTP) :
 * { message?, action?, devis? } → { reply, devis, vue }. Lève ErreurMetier si la saisie est invalide.
 */
export function traiter({ message, action, devis } = {}) {
	const d = normaliserDevis(devis);
	let reply = "";
	if (action) reply = appliquerAction(d, action) ?? "";
	else if (typeof message === "string") reply = interpreter(message, d);
	syncAccessoires(d);
	const vue = calculerVue(d);
	const pose = (message || action?.type === "choisir") && vue.lignes.some((l) => l.montant !== null);
	if (pose)
		reply += `${reply ? "\n" : ""}Total ${GAMMES[d.gamme].label} : CHF ${chf(vue.totaux.ttc)} TTC (${chf(vue.totaux.ht)} HT).`;
	return { reply, devis: d, vue };
}
