// src/services/database.ts
import * as SQLite from 'expo-sqlite';
import { Photo } from '../types';

// 1. 최신 방식: 동기식(Sync) DB 열기
const db = SQLite.openDatabaseSync('photos.db');

/**
 * 1. 테이블 초기화
 */
export const initDB = async (): Promise<void> => {
  try {
    // 개발 중 스키마 꼬임 방지 (필요시 주석 해제)
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

    // 2. 🆕 [신규] 앨범 테이블 (앨범 제목 저장)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS albums (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);

    // 3. 🆕 [신규] 앨범-사진 연결 테이블 (매핑 테이블)
    // album_id와 photo_id의 쌍(Pair)은 유니크해야 함 (같은 사진을 같은 앨범에 두 번 넣으면 안 되니까)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS album_photos (
        album_id INTEGER NOT NULL,
        photo_id TEXT NOT NULL,
        PRIMARY KEY (album_id, photo_id),
        FOREIGN KEY (album_id) REFERENCES albums (id) ON DELETE CASCADE,
        FOREIGN KEY (photo_id) REFERENCES photos (id) ON DELETE CASCADE
      );
    `);

    console.log('✅ [DB] 테이블 초기화 완료 (Photos, Albums, AlbumPhotos)');
  } catch (error) {
    console.error('❌ [DB] 초기화 실패:', error);
    throw error;
  }
};

/**
 * 2. 사진 데이터 삽입/업데이트
 */
export const insertPhoto = async (photo: Photo): Promise<void> => {
  try {
    const safeArgs = [
      photo.id ?? '',
      photo.local_uri ?? '',
      photo.captured_at ?? Date.now(),
      photo.width ?? 0,
      photo.height ?? 0,
      photo.latitude ?? null,
      photo.longitude ?? null,
      photo.address ?? null,
      photo.ai_tags ? JSON.stringify(photo.ai_tags) : null,
    ];

    db.runSync(
      `INSERT OR REPLACE INTO photos (
        id, local_uri, captured_at, width, height, latitude, longitude, address, ai_tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      safeArgs
    );
  } catch (error) {
    console.error(`❌ [DB] 저장 실패 (ID: ${photo.id})`, error);
    throw error;
  }
};

/**
 * 3. 전체 조회 (테스트용)
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

// 👇👇👇 [복구된 함수들] 👇👇👇

/**
 * 4. GPS 정보(위도/경도)가 없는 사진 조회
 * - limit 인자를 받아서 한 번에 가져올 개수를 조절합니다. (기본값 50)
 */
export const getNoGpsPhotos = async (limit: number = 50): Promise<Photo[]> => {
  try {
    // LIMIT ? 구문을 추가하고, 파라미터로 limit 숫자를 넘깁니다.
    const rows = db.getAllSync<Photo>(
      `SELECT * FROM photos WHERE latitude IS NULL OR longitude IS NULL LIMIT ?;`,
      [limit]
    );
    return rows;
  } catch (error) {
    console.error('❌ [DB] GPS 없는 사진 조회 실패:', error);
    return [];
  }
};

/**
 * 🆕 [추가] AI 분석 결과(위치 추론)를 DB에 반영하는 함수
 * GPT가 "이곳은 제주도 성산일출봉입니다"라고 답하면,
 * 해당 사진의 address 컬럼을 업데이트한다.
 * 🆕 [업그레이드] 위치 추론 결과(주소 + 좌표)를 DB에 반영하는 함수
 * 이제 주소뿐만 아니라 위도(lat), 경도(lon)도 함께 업데이트한다.
 */
export const updatePhotoLocation = async (
  id: string, 
  address: string, 
  latitude: number, 
  longitude: number
): Promise<void> => {
 try {
    // 쿼리 설명: 
    // photos 테이블에서 id가 일치하는 행을 찾아서
    // address, latitude, longitude 3개 컬럼을 동시에 수정함.
    await db.runAsync(
      `UPDATE photos SET address = ?, latitude = ?, longitude = ? WHERE id = ?;`,
      [address, latitude, longitude, id]
    );
    console.log(`✅ [DB] 위치 정보 풀세트 업데이트 (ID: ${id}) -> ${address} (${latitude}, ${longitude})`);
  } catch (error) {
    console.error(`❌ [DB] 위치 업데이트 실패 (ID: ${id}):`, error);
  }
};

/**
 * 🆕 [추가] MobileCLIP이 분석한 태그를 DB에 저장하는 함수
 * 위치 추론(GPT)을 위해 필요한 텍스트 단서들을 저장한다.
 */
export const updatePhotoTags = async (id: string, tags: string): Promise<void> => {
  try {
    await db.runAsync(
      `UPDATE photos SET ai_tags = ? WHERE id = ?;`,
      [tags, id]
    );
    console.log(`🏷️ [DB] 태그 저장 완료 (ID: ${id}) -> ${tags}`);
  } catch (error) {
    console.error(`❌ [DB] 태그 저장 실패 (ID: ${id}):`, error);
    throw error; // 여기서 실패하면 뒤에 GPT 단계로 넘어가면 안 되니까 에러를 던짐
  }
};

// =================================================================
// 📂 앨범 기능 (Album Features)
// =================================================================

/**
 * 1. 새 앨범 생성하기
 * @param title 앨범 제목 (예: "2026 제주도")
 * @returns 생성된 앨범의 ID
 */
export const createAlbum = async (title: string): Promise<number | null> => {
  try {
    const createdAt = Date.now();
    const result = await db.runAsync(
      `INSERT INTO albums (title, created_at) VALUES (?, ?);`,
      [title, createdAt]
    );
    console.log(`📂 [DB] 새 앨범 생성: "${title}" (ID: ${result.lastInsertRowId})`);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('❌ [DB] 앨범 생성 실패:', error);
    return null;
  }
};

/**
 * 2. 앨범에 사진 담기 (여러 장 동시에)
 * @param albumId 넣을 앨범 ID
 * @param photoIds 선택된 사진들의 ID 배열
 */
export const addPhotosToAlbum = async (albumId: number, photoIds: string[]): Promise<void> => {
  try {
    // 트랜잭션 대신 반복문으로 처리 (SQLite는 빠르니까 괜찮음)
    // INSERT OR IGNORE: 이미 들어있는 사진이면 무시함
    // const statements = photoIds.map(() => 
    //   `INSERT OR IGNORE INTO album_photos (album_id, photo_id) VALUES (?, ?);`
    // );
    
    // 비동기 병렬 처리
    await Promise.all(
      photoIds.map(photoId => 
        db.runAsync(
          `INSERT OR IGNORE INTO album_photos (album_id, photo_id) VALUES (?, ?);`,
          [albumId, photoId]
        )
      )
    );
    
    console.log(`📥 [DB] 앨범(${albumId})에 사진 ${photoIds.length}장 추가 완료.`);
  } catch (error) {
    console.error('❌ [DB] 앨범에 사진 추가 실패:', error);
  }
};

/**
 * 3. 모든 앨범 목록 가져오기 (사이드바용)
 * - 각 앨범에 사진이 몇 장 들었는지(count)도 같이 가져옴
 * - 대표 이미지(cover_uri)로 가장 최근 사진 하나를 가져옴
 */
export interface AlbumSummary {
  id: number;
  title: string;
  count: number;
  cover_uri: string | null;
}

export const getAlbums = async (): Promise<AlbumSummary[]> => {
  try {
    // 쿼리가 좀 복잡해 보이지만, "앨범 정보 + 사진 개수 + 대표 사진 1장"을 한 방에 가져오는 효율적인 쿼리야.
    const query = `
      SELECT 
        a.id, 
        a.title, 
        COUNT(ap.photo_id) as count,
        MAX(p.local_uri) as cover_uri 
      FROM albums a
      LEFT JOIN album_photos ap ON a.id = ap.album_id
      LEFT JOIN photos p ON ap.photo_id = p.id
      GROUP BY a.id
      ORDER BY a.created_at DESC;
    `;
    
    const albums = await db.getAllAsync<AlbumSummary>(query);
    return albums;
  } catch (error) {
    console.error('❌ [DB] 앨범 목록 조회 실패:', error);
    return [];
  }
};

/**
 * 4. 특정 앨범의 사진들 다 가져오기 (앨범 클릭 시)
 */
export const getPhotosByAlbum = async (albumId: number): Promise<any[]> => {
  try {
    const query = `
      SELECT p.* FROM photos p
      JOIN album_photos ap ON p.id = ap.photo_id
      WHERE ap.album_id = ?
      ORDER BY p.captured_at DESC;
    `;
    const photos = await db.getAllAsync(query, [albumId]);
    return photos;
  } catch (error) {
    console.error(`❌ [DB] 앨범(${albumId}) 내용 조회 실패:`, error);
    return [];
  }
};

// /**
//  * 5. 특정 사진의 주소(Address) 업데이트
//  * - LLM이나 Geocoding으로 알아낸 주소를 DB에 저장할 때 사용합니다.
//  */
// export const updatePhotoAddress = async (id: string, address: string): Promise<void> => {
//   try {
//     db.runSync(
//       `UPDATE photos SET address = ? WHERE id = ?;`,
//       [address, id]
//     );
//     console.log(`✅ [DB] 주소 업데이트 완료 (ID: ${id}) -> ${address}`);
//   } catch (error) {
//     console.error(`❌ [DB] 주소 업데이트 실패 (ID: ${id})`, error);
//     throw error;
//   }
// };

/**
 * (보너스) 태그(AI Tags) 업데이트 함수
 * - 혹시 analysisService에서 태그도 저장해야 한다면 이 함수를 쓰세요.
 */
// export const updatePhotoTags = async (id: string, tags: string[]): Promise<void> => {
//   try {
//     const tagsJson = JSON.stringify(tags);
//     db.runSync(
//       `UPDATE photos SET ai_tags = ? WHERE id = ?;`,
//       [tagsJson, id]
//     );
//     console.log(`✅ [DB] 태그 업데이트 완료 (ID: ${id})`);
//   } catch (error) {
//     console.error(`❌ [DB] 태그 업데이트 실패 (ID: ${id})`, error);
//     throw error;
//   }
// };