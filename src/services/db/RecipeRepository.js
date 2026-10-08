/**
 * RecipeRepository.js
 * All Firestore operations for the recipes collection.
 */
import { collection, addDoc, updateDoc, doc, query, onSnapshot, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { auditLog, AUDIT } from '../auditLog.js';

export const recipesCollection = collection(db, 'recipes');

export const addRecipeToDB = async (recipeData) => {
  try {
    const docRef = await addDoc(recipesCollection, { ...recipeData, uid: auth.currentUser?.uid });
    return docRef.id;
  } catch (e) {
    console.error('Error adding recipe: ', e);
    throw e;
  }
};

export const updateRecipeInDB = async (recipeId, recipeData) => {
  try {
    await updateDoc(doc(db, 'recipes', recipeId), recipeData);
  } catch (e) {
    console.error('Error updating recipe: ', e);
    throw e;
  }
};

export const deleteRecipeFromDB = async (recipeId) => {
  try {
    const uid = auth.currentUser?.uid;
    await updateDoc(doc(db, 'recipes', recipeId), { deleted: true, deletedAt: new Date().toISOString() });
    auditLog(AUDIT.RECIPE_DELETED, uid, { recipeId });
  } catch (e) {
    console.error('Error deleting recipe: ', e);
    throw e;
  }
};

export const subscribeToRecipes = (callback, errorCallback, userId) => {
  const q = query(recipesCollection, where('uid', '==', userId || auth.currentUser?.uid || 'NO_USER'));
  return onSnapshot(
    q,
    (snapshot) => {
      const valid = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data.deleted) valid.push({ id: docSnap.id, ...data });
      });
      callback(valid);
    },
    (error) => {
      console.error('Recipes subscription error:', error);
      if (errorCallback) errorCallback(error);
    }
  );
};
