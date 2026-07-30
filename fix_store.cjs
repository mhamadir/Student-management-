const fs = require('fs');
let code = fs.readFileSync('src/store.tsx', 'utf8');

code = code.replace(/if \(!profileMatch \|\| profileMatch\.length < 7\) \{[\s\S]*?const fullName = vals\[6\];/m, `if (!profileMatch || profileMatch.length < 6) {
        return { success: false, message: 'فایلی هەڵبژێردراو نەناسراوە! تکایە فایلی دروستی فێرخوازان بەکاربهێنە' };
      }

      let createdAt = '', notes, job, phone, birthdate, rollNumber, fullName;
      if (profileMatch.length === 6) {
        const vals = profileMatch.map(m => m.slice(1, -1));
        notes = vals[0];
        job = vals[1];
        phone = vals[2];
        birthdate = vals[3];
        rollNumber = vals[4];
        fullName = vals[5];
      } else {
        const vals = profileMatch.map(m => m.slice(1, -1));
        createdAt = vals[0];
        notes = vals[1];
        job = vals[2];
        phone = vals[3];
        birthdate = vals[4];
        rollNumber = vals[5];
        fullName = vals[6];
      }`);

fs.writeFileSync('src/store.tsx', code);
