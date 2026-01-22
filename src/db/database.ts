// src/services/database.ts
import * as SQLite from 'expo-sqlite';
import { Photo } from '@/src/lib/types/photo';

// 1. 최신 방식: 동기식(Sync) DB 열기
// 구버전 openDatabase -> 신버전 openDatabaseSync
const db = SQLite.openDatabaseSync('photos.db');

/**
 * 1. 테이블 초기화
 * - execSync를 사용하면 긴 SQL도 한 번에 실행 가능합니다.
 */
export const initDB = async (): Promise<void> => {
  try {
    // 개발 중 스키마 꼬임 방지를 위해 기존 테이블 삭제 (필요시 주석 해제)
    // db.execSync('DROP TABLE IF EXISTS photos;');

    db.execSync(`
      CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY NOT NULL,
        local_uri TEXT NOT NULL,
        captured_at INTEGER NOT NULL,
        width INTEGER,
        height INTEGER,
        latitude REAL,
        longitude REAL,
        address TEXT,
        ai_tags TEXT
      );
    `);
    console.log('✅ [DB] Photo 테이블 준비 완료');
  } catch (error) {
    console.error('❌ [DB] 초기화 실패:', error);
    throw error;
  }
};

/**
 * 2. 사진 데이터 삽입/업데이트
 * - runSync를 사용하여 결과를 즉시 반환받습니다.
 */
export const insertPhoto = async (photo: Photo): Promise<void> => {
  try {
    // undefined 방지 (Sanitizing)
    const safeArgs = [
      photo.id ?? '',                // TEXT
      photo.local_uri ?? '',         // TEXT
      photo.captured_at ?? Date.now(), // INTEGER
      photo.width ?? 0,              // INTEGER
      photo.height ?? 0,             // INTEGER
      photo.latitude ?? null,        // REAL
      photo.longitude ?? null,       // REAL
      photo.address ?? null,         // TEXT
      photo.ai_tags ? JSON.stringify(photo.ai_tags) : null, // TEXT
    ];

    // transaction(tx => ...) 콜백 방식이 사라지고, 바로 실행합니다.
    db.runSync(
      `INSERT OR REPLACE INTO photos (
        id, local_uri, captured_at, width, height, latitude, longitude, address, ai_tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      safeArgs
    );

    // 성공 시 별도 로그 없이 리턴 (속도 향상)
  } catch (error) {
    console.error(`❌ [DB] 저장 실패 (ID: ${photo.id})`, error);
    // 에러를 던져야 호출하는 쪽에서 알 수 있음
    throw error;
  }
};

/**
 * 3. 전체 조회 (테스트용)
 * - getAllSync를 사용하면 배열로 바로 줍니다.
 */
export const getAllPhotos = async (): Promise<Photo[]> => {
  try {
    const rows = db.getAllSync<Photo>(
      `SELECT * FROM photos ORDER BY captured_at DESC;`
    );
    return rows;
  } catch (error) {
    console.error('❌ [DB] 조회 실패:', error);
    return [];
  }
};