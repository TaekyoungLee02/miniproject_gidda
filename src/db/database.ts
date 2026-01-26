// src/services/database.ts
import * as MediaLibrary from 'expo-media-library';
import * as SQLite from 'expo-sqlite';
import { Photo } from '@/src/lib/types/photo';

// 1. 최신 방식: 동기식(Sync) DB 열기
const db = SQLite.openDatabaseSync('photos.db');
// 최근 검색어 노출 갯수
const MAX_SEARCH_HISTORY = 5; // 나중에 필요하면 이 숫자만 바꾸면 돼!

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

    // 2. 🆕 MobileCLIP 벡터 전용 테이블 추가
    // 사진 ID와 1:1 매칭되며, 실제 512차원 행렬(embedding)을 저장함
    db.execSync(`
      CREATE TABLE IF NOT EXISTS photo_embeddings (
        photo_id TEXT PRIMARY KEY NOT NULL,
        embedding BLOB NOT NULL, -- 512 * 4bytes (Float32) = 2048 bytes
        FOREIGN KEY (photo_id) REFERENCES photos (id) ON DELETE CASCADE
      );
    `);

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

    // 최근 검색어 테이블  
    db.execSync(`
      CREATE TABLE IF NOT EXISTS search_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query_text TEXT NOT NULL,      -- GPT 쿼리 키워드 뭉치
        created_at INTEGER NOT NULL    -- 검색 시간
      );
    `);

    // [STEP 2] 🆕 즐겨찾기 시스템 앨범 생성 로직 실행
    // 함수로 감싸지 말고 바로 실행하거나, 정의 후 바로 호출해야 함
    const favAlbum = db.getFirstSync<{id: number}>(
      "SELECT id FROM albums WHERE title = '즐겨찾기' LIMIT 1"
    );

    if (!favAlbum) {
      db.runSync(
        "INSERT INTO albums (title, created_at) VALUES (?, ?)",
        ['즐겨찾기', Date.now()]
      );
      console.log("⭐ [DB] 즐겨찾기 앨범 기본 생성 완료");
    }

    console.log('✅ [DB] 모든 테이블 및 기본 데이터 초기화 완료');
  } catch (error) {
    console.error('❌ [DB] 초기화 실패:', error);
    throw error;
  }
};

/**
 * 🔍 검색 기록 저장 (최대 개수 유지)
 */
export const saveSearchHistory = async (queryText: string): Promise<void> => {
  try {
    // 1. 새로운 검색어 저장
    db.runSync(
      "INSERT INTO search_history (query_text, created_at) VALUES (?, ?)",
      [queryText, Date.now()]
    );

    // 2. 최대 개수(MAX_SEARCH_HISTORY)를 초과하는 오래된 기록 삭제
    // 최신순으로 5개만 남기고 나머지는 ID 기반으로 삭제하는 쿼리
    db.runSync(`
      DELETE FROM search_history 
      WHERE id NOT IN (
        SELECT id FROM search_history 
        ORDER BY created_at DESC 
        LIMIT ?
      )
    `, [MAX_SEARCH_HISTORY]);

    console.log(`✅ [DB] 검색 기록 저장 완료: ${queryText}`);
  } catch (error) {
    console.error("❌ [DB] 검색 기록 저장 실패:", error);
  }
};

/**
 * 📜 전체 검색 기록 조회 (최신순)
 */
export const getSearchHistory = async (): Promise<any[]> => {
  try {
    return db.getAllSync("SELECT * FROM search_history ORDER BY created_at DESC");
  } catch (error) {
    console.error("❌ [DB] 검색 기록 조회 실패:", error);
    return [];
  }
};

/**
 * 🗑️ 특정 검색 기록 삭제
 */
export const deleteSearchHistory = async (id: number): Promise<void> => {
  try {
    db.runSync("DELETE FROM search_history WHERE id = ?", [id]);
    console.log(`✅ [DB] 검색 기록 삭제 완료 (ID: ${id})`);
  } catch (error) {
    console.error("❌ [DB] 검색 기록 삭제 실패:", error);
  }
};

/**
 * 벡터 데이터가 없는 사진을 찾는 쿼리
 * photos 테이블에는 있는데 photo_embeddings 테이블에는 없는 데이터를 조회함
 */
export const getPhotosMissingVector = async (limit: number = 5): Promise<Photo[]> => {
  const query = `
    SELECT p.* FROM photos p
    LEFT JOIN photo_embeddings e ON p.id = e.photo_id
    WHERE e.photo_id IS NULL
    LIMIT ?;
  `;
  return await db.getAllAsync<Photo>(query, [limit]);
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

export const insertPhotoAllFromAsset
    = async (assets : MediaLibrary.Asset[],
             aiTags : string[],
             addresses : string[]) : Promise<void> =>
{
  try {
    await db.withTransactionAsync(async () => {
      for (const index in assets) {
        const safeArgs = [
          assets[index].id ?? '',
          assets[index].uri ?? '',
          assets[index].creationTime ?? Date.now(),
          assets[index].width ?? 0,
          assets[index].height ?? 0,
          (assets[index] as any).location.latitude ?? null,
          (assets[index] as any).location.longitude ?? null,
          addresses[index] ?? null,
          aiTags[index] ? JSON.stringify(aiTags[index]) : null,
        ];

        db.runSync(
            `INSERT OR REPLACE INTO photos (
              id, local_uri, captured_at, width, height, latitude, longitude, address, ai_tags
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            safeArgs
        );
      }
    });
  } catch (error) {
    console.error(`❌ [DB] 저장 실패`, error);
    throw error;
  }
}

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

/**
 * 🆕 사진의 512차원 벡터(Embedding)를 저장하는 함수
 * @param photoId 사진 ID
 * @param embedding Float32Array 형태의 512차원 벡터
 */
export const insertPhotoEmbedding = async (
  photoId: string,
  embedding: Float32Array
): Promise<void> => {
  try {
    // 1. Float32Array를 바이트 배열로 변환 (512 * 4 bytes = 2048 bytes)
    const uint8Embedding = new Uint8Array(embedding.buffer);

    // 2. DB에 INSERT (기존에 있으면 덮어쓰기: REPLACE)
    db.runSync(
      `INSERT OR REPLACE INTO photo_embeddings (photo_id, embedding) VALUES (?, ?);`,
      [photoId, uint8Embedding]
    );
    
    console.log(`✅ [DB] 벡터 저장 완료 (ID: ${photoId})`);
  } catch (error) {
    console.error(`❌ [DB] 벡터 저장 실패 (ID: ${photoId})`, error);
    throw error;
  }
};

/**
 * 🆕 벡터 유사도 검색용 데이터 로드 (전체 벡터 가져오기)
 * 나중에 검색 엔진 고도화 시 사용
 */
export const getAllEmbeddings = async (): Promise<{photo_id: string, embedding: Float32Array}[]> => {
  const rows = db.getAllSync<{photo_id: string, embedding: Uint8Array}>(
    `SELECT * FROM photo_embeddings`
  );
  
  return rows.map(row => ({
    photo_id: row.photo_id,
    embedding: new Float32Array(row.embedding.buffer) // 다시 숫자로 복구
  }));
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

/**
 * ⭐️ 사진을 즐겨찾기에 추가/제거 (토글)
 * 작성자: 차명근 (백엔드/DB 담당)
 */
export const toggleFavorite = async (photoId: string): Promise<boolean> => {
  try {
    // 1. 즐겨찾기 앨범 ID 찾기
    const album = db.getFirstSync<{id: number}>("SELECT id FROM albums WHERE title = '즐겨찾기'");
    if (!album) {
        console.error("❌ 즐겨찾기 앨범이 존재하지 않습니다.");
        return false;
    }

    // 2. 이미 등록됐는지 확인 (매핑 테이블 조회)
    const exists = db.getFirstSync(
      "SELECT 1 FROM album_photos WHERE album_id = ? AND photo_id = ?",
      [album.id, photoId]
    );

    if (exists) {
      db.runSync("DELETE FROM album_photos WHERE album_id = ? AND photo_id = ?", [album.id, photoId]);
      return false; // 즐겨찾기 해제됨
    } else {
      db.runSync("INSERT INTO album_photos (album_id, photo_id) VALUES (?, ?)", [album.id, photoId]);
      return true; // 즐겨찾기 추가됨
    }
  } catch (error) {
    console.error("❌ [DB] 즐겨찾기 토글 실패:", error);
    throw error; // 에러는 위로 던져서 프론트에서 알림을 띄울 수 있게 함
  }
};

/**
 * ⭐️ 즐겨찾기 앨범에 등록된 모든 사진 가져오기
 * 작성자: 차명근 (백엔드/DB 담당)
 */
export const getFavoritePhotos = async (): Promise<Photo[]> => {
  try {
    const query = `
      SELECT p.* FROM photos p
      JOIN album_photos ap ON p.id = ap.photo_id
      JOIN albums a ON ap.album_id = a.id
      WHERE a.title = '즐겨찾기'
      ORDER BY p.captured_at DESC; -- 최신순 정렬
    `;
    
    const favorites = await db.getAllAsync<Photo>(query);
    console.log(`⭐ [DB] 즐겨찾기 사진 ${favorites.length}장 로드 완료`);
    return favorites;
  } catch (error) {
    console.error("❌ [DB] 즐겨찾기 사진 조회 실패:", error);
    return [];
  }
};

/**
 * 🖼️ 전달받은 여러 개의 ID로 사진 상세 정보 가져오기
 * @param ids 백엔드(유사도 계산팀)에서 넘겨준 사진 ID 배열
 */
export const getPhotosByIds = async (ids: string[]): Promise<Photo[]> => {
  if (!ids || ids.length === 0) return [];

  try {
    // ID 개수만큼 '?'를 생성 (예: ids가 3개면 "?, ?, ?")
    const placeholders = ids.map(() => '?').join(',');
    
    const query = `
      SELECT * FROM photos 
      WHERE id IN (${placeholders})
      ORDER BY CASE id 
        ${ids.map((id, index) => `WHEN ? THEN ${index}`).join(' ')}
      END;
    `;
    // ORDER BY CASE를 쓰는 이유는 백엔드가 보내준 '유사도 순서'를 유지하기 위해서야!

    // 쿼리 파라미터는 [ID들..., ID들...] 형태로 두 번 들어가야 함 (WHERE절용, 정렬용)
    const params = [...ids, ...ids];
    const photos = await db.getAllAsync<Photo>(query, params);
    
    return photos;
  } catch (error) {
    console.error("❌ [DB] ID 기반 사진 조회 실패:", error);
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