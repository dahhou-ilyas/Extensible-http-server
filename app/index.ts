const timestamp =1766593387.104000000; // en secondes

// convertir en millisecondes
const date = new Date(timestamp * 1000);

// format lisible en heure Maroc
const marocTime = date.toLocaleString("fr-FR", {
  timeZone: "Africa/Casablanca",
  dateStyle: "full",
  timeStyle: "medium",
});

console.log(marocTime);