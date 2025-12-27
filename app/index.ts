const timestamp =1766593387.104000000;

const date = new Date(timestamp * 1000);

const marocTime = date.toLocaleString("fr-FR", {
  timeZone: "Africa/Casablanca",
  dateStyle: "full",
  timeStyle: "medium",
});

console.log(marocTime);