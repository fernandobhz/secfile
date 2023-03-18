import { createInterface } from "readline";

export const padZero = num => {
  return num.toString().padStart(2, "0");
};

export const formatDate = date => {
  const dateString = date.toISOString();
  const year = dateString.substring(2, 4);
  const month = padZero(dateString.substring(5, 7));
  const day = padZero(dateString.substring(8, 10));
  const hours = padZero(dateString.substring(11, 13));
  const minutes = padZero(dateString.substring(14, 16));
  const seconds = padZero(dateString.substring(17, 19));
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

export const parseDate = dateString => {
  const year = parseInt(dateString.substring(0, 2), 10) + 2000;
  const month = parseInt(dateString.substring(2, 4), 10) - 1;
  const day = parseInt(dateString.substring(4, 6), 10);
  const hours = parseInt(dateString.substring(6, 8), 10);
  const minutes = parseInt(dateString.substring(8, 10), 10);
  const seconds = parseInt(dateString.substring(10, 12), 10);
  return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
};

export const askPassword = async () => {
  const readline = require("readline");

  const stdInOutInterface = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  await new Promise(resolve => {
    stdInOutInterface.question("Password: ", password => {
      resolve(password);
    });
  });
};
