import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "cream-and-crust",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const snap = await getDocs(collection(db, 'business'));
  if (snap.empty) {
    console.log("No businesses found");
    process.exit(1);
  }
  const biz = snap.docs[0].data();
  console.log("Found username:", biz.username, "uid:", snap.docs[0].id);
  process.exit(0);
}
run();
