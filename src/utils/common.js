export const formatDate = (inputDate) => {
  // Parse the input string into a Date object
  const date = new Date(inputDate);

  // Extract the components
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  // Combine the components into the desired format
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};
