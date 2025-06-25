require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

async function resetPassword() {
  try {
    await mongoose.connect('mongodb://localhost:27017/student-timetable');
    const defaultPassword = 'passme@123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    const result = await mongoose.connection.db.collection('students').updateOne(
      { studentId: '20201CIT0043' },
      { 
        $set: { 
          password: hashedPassword,
          isFirstLogin: true
        }
      }
    );
    
    console.log('Password reset result:', result);
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

resetPassword(); 