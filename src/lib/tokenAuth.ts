import { collection, addDoc, query, where, getDocs, Timestamp, limit } from 'firebase/firestore';
import { db } from '$lib/firebase';

export interface AccessToken
{
  id: string;
  token: string;
  expiry: Timestamp;
  createdAt: Timestamp;
  validHours: number;
  isValid: boolean;
}

export class TokenManager {
  public static async createToken(validHours: number): Promise<string> {
    if (validHours <= 0) {
      throw new Error('유효 기간은 0보다 커야 합니다');
    }

    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const now = Timestamp.now();
    const expiryDate = new Timestamp(
      now.seconds + (validHours * 3600),
      now.nanoseconds
    );

    await addDoc(collection(db, "accessTokens"), {
      token,
      expiry: expiryDate,
      createdAt: now,
      validHours,
      isValid: true
    });

    return token;
  }

  public static async validateToken(token: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'accessTokens'),
        where('token', '==', token),
        where('isValid', '==', true),
        where('expiry', '>', Timestamp.now()),
        limit(1)
      );

      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('토큰 검증 에러:', error);
      return false;
    }
  }
} 