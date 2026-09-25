// gameLogic.js - Bộ xử lý luật chơi Oẳn Tù Tì v2 (OTTv2) trên bàn cờ 9x9

export const COLS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
export const ICONS = { rock: '✊', paper: '✋', scissors: '✌️' };
export const NAMES = { rock: 'Đấm', paper: 'Lá', scissors: 'Kéo' };

/**
 * 1. KHỞI TẠO BÀN CỜ 9x9 BAN ĐẦU
 * - Ô a1 là [8][0] (góc dưới trái)
 * - Ô i9 là [0][8] (góc trên phải)
 * - Mỗi người chơi có 9 quân (3 Đấm, 3 Lá, 3 Kéo) xếp quanh căn cứ của mình,
 *   chừa trống đúng ô a1 và i9 để làm ô đích.
 */
export function createInitialBoard() {
  const board = Array(9).fill(null).map(() => Array(9).fill(null));
  const lineup = ['rock', 'paper', 'scissors', 'rock', 'paper', 'scissors', 'rock', 'paper', 'scissors'];

  // Xếp 9 quân của Người chơi 1 (P1 - Xanh) ở hàng 1 (r=8) và ô a2 (r=7, c=0)
  for (let c = 1; c < 9; c++) {
    board[8][c] = { owner: 'P1', type: lineup[c - 1] };
  }
  board[7][0] = { owner: 'P1', type: lineup[8] };

  // Xếp 9 quân của Người chơi 2 (P2 - Đỏ) ở hàng 9 (r=0) và ô i8 (r=1, c=8)
  for (let c = 0; c < 8; c++) {
    board[0][c] = { owner: 'P2', type: lineup[c] };
  }
  board[1][8] = { owner: 'P2', type: lineup[8] };

  return board;
}

/**
 * 2. LUẬT KHẮC CHẾ OẲN TÙ TÌ
 * Đấm (rock) ăn Kéo (scissors)
 * Kéo (scissors) ăn Lá (paper)
 * Lá (paper) ăn Đấm (rock)
 */
export function canBeat(attackerType, defenderType) {
  return (
    (attackerType === 'rock' && defenderType === 'scissors') ||
    (attackerType === 'scissors' && defenderType === 'paper') ||
    (attackerType === 'paper' && defenderType === 'rock')
  );
}

/**
 * 3. KIỂM TRA NƯỚC ĐI HỢP LỆ (DI CHUYỂN 8 HƯỚNG & LUẬT CHẶN/ĂN QUÂN)
 * Trả về:
 * - 'move'   : Nếu đi vào ô trống hợp lệ
 * - 'attack' : Nếu ăn được quân đối phương
 * - null     : Nếu nước đi sai luật hoặc bị chặn
 */
export function getMoveType(board, r1, c1, r2, c2) {
  // Kiểm tra tọa độ nằm trong bàn cờ 9x9
  if (r2 < 0 || r2 > 8 || c2 < 0 || c2 > 8) return null;

  // Không được đứng yên tại chỗ
  if (r1 === r2 && c1 === c2) return null;

  // Luật Vua cờ vua: Chỉ được đi 1 ô theo 8 hướng (ngang, dọc, chéo)
  const rowDiff = Math.abs(r1 - r2);
  const colDiff = Math.abs(c1 - c2);
  if (rowDiff > 1 || colDiff > 1) return null;

  const movingPiece = board[r1][c1];
  const targetPiece = board[r2][c2];
  if (!movingPiece) return null;

  // Trường hợp 1: Ô đích trống -> Cho phép di chuyển
  if (!targetPiece) return 'move';

  // Trường hợp 2: Ô đích là quân cùng phe -> Đứng chặn đường nhau
  if (targetPiece.owner === movingPiece.owner) return null;

  // Trường hợp 3: Quân đối phương nhưng CÙNG LOẠI (VD: Đấm gặp Đấm)
  // -> Đề bài: "hai quân cùng loại thì không thể ăn nhau mà chỉ đứng chặn đường nhau"
  if (targetPiece.type === movingPiece.type) return null;

  // Trường hợp 4: Quân đối phương KHÁC LOẠI -> Áp dụng luật Oẳn tù tì
  if (canBeat(movingPiece.type, targetPiece.type)) {
    return 'attack';
  }

  // Nếu quân mình yếu hơn quân ở ô đích (VD: Kéo định bước vào ô Đấm) -> Không đi được
  return null;
}

/**
 * 4. LẤY DANH SÁCH TẤT CẢ CÁC Ô HỢP LỆ MÀ QUÂN TẠI (r, c) CÓ THỂ ĐI TỚI
 * Dùng để tô sáng (highlight) gợi ý trên bàn cờ
 */
export function getValidMovesForPiece(board, r, c) {
  const moves = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      const type = getMoveType(board, r, c, nr, nc);
      if (type) {
        moves.push({ r: nr, c: nc, type });
      }
    }
  }
  return moves;
}

/**
 * 5. ĐẾM SỐ LƯỢNG QUÂN MỖI LOẠI TRÊN BÀN CỜ
 */
export function countPieces(board) {
  const counts = {
    P1: { rock: 0, paper: 0, scissors: 0 },
    P2: { rock: 0, paper: 0, scissors: 0 }
  };

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (p) counts[p.owner][p.type]++;
    }
  }
  return counts;
}

/**
 * 6. KIỂM TRA ĐIỀU KIỆN THẮNG SAU KHI ĐI CỜ
 * - Điều kiện 1: Đưa được quân vào ô đích (a1 [8][0] hoặc i9 [0][8]).
 * - Điều kiện 2: Ăn hết sạch hoàn toàn 1 loại quân (Đấm, Lá, hoặc Kéo) của đối phương.
 */
export function checkWinner(board, movedPiece, toR, toC) {
  // Điều kiện 1: Chạm ô a1 ([8][0]) hoặc i9 ([0][8])
  // P1 xuất phát ở góc a1 nên thắng khi chạm i9 ([0][8])
  // P2 xuất phát ở góc i9 nên thắng khi chạm a1 ([8][0])
  // (Lưu ý: Nếu thầy yêu cầu chạm BẤT KỲ ô nào trong 2 ô a1/i9 đều thắng thì bỏ điều kiện check owner)
  if (movedPiece.owner === 'P1' && toR === 0 && toC === 8) {
    return { winner: 'P1', reason: 'Người chơi 1 (Xanh) thắng do đưa được quân vào ô i9!' };
  }
  if (movedPiece.owner === 'P2' && toR === 8 && toC === 0) {
    return { winner: 'P2', reason: 'Người chơi 2 (Đỏ) thắng do đưa được quân vào ô a1!' };
  }

  // Điều kiện 2: Ăn hết sạch hoàn toàn 1 loại quân của đối phương
  const counts = countPieces(board);
  for (const type of ['rock', 'paper', 'scissors']) {
    if (counts.P2[type] === 0) {
      return {
        winner: 'P1',
        reason: `Người chơi 1 (Xanh) thắng do ăn sạch toàn bộ quân ${NAMES[type]} (${ICONS[type]}) của Đỏ!`
      };
    }
    if (counts.P1[type] === 0) {
      return {
        winner: 'P2',
        reason: `Người chơi 2 (Đỏ) thắng do ăn sạch toàn bộ quân ${NAMES[type]} (${ICONS[type]}) của Xanh!`
      };
    }
  }

  return null;
}

/**
 * 7. HÀM THỰC THI NƯỚC ĐI TRÊN TRẠNG THÁI GAME (PURE STATE TRANSITION)
 * Nhận vào gameState hiện tại và tọa độ đi -> Cập nhật bàn cờ, đổi lượt và kiểm tra thắng.
 */
export function applyMove(gameState, fromR, fromC, toR, toC) {
  const moveType = getMoveType(gameState.board, fromR, fromC, toR, toC);
  if (!moveType) return false;

  const movingPiece = gameState.board[fromR][fromC];
  if (!movingPiece || movingPiece.owner !== gameState.turn) return false;

  // Di chuyển quân (hoặc đè lên quân đối phương để ăn)
  gameState.board[toR][toC] = movingPiece;
  gameState.board[fromR][fromC] = null;

  // Kiểm tra thắng thua
  const winResult = checkWinner(gameState.board, movingPiece, toR, toC);
  if (winResult) {
    gameState.winner = winResult.winner;
    gameState.winReason = winResult.reason;
  } else {
    // Chưa ai thắng thì đổi lượt
    gameState.turn = gameState.turn === 'P1' ? 'P2' : 'P1';
  }

  return true;
}