import { db } from '../config/db.js';

export const signupNewCustomer = async (data) => {
  try {
    const result = await db.raw(`CALL RegisterCustomer(?, ?, ?, ?, ?, ?, ?, ?)`, [
      data.username,
      data.password,
      data.name,
      data.phone_number,
      data.email,
      data.personal_id,
      data.date_of_birth,
      data.gender
    ]);
    console.log(result[0][0].message); // Logs the success message
    return { success: true, message: result[0][0].message };
  } catch (error) {
    // Log the error for debugging
    console.error('Error during signup:', error);

    // Check if it's a known error (SIGNAL exception)
    if (error.code === 'ER_SIGNAL_EXCEPTION') {
      return { success: false, message: error.sqlMessage }; // Return the custom message
    }

    // Handle other unexpected errors
    throw new Error('An unexpected error occurred');
  }
};
