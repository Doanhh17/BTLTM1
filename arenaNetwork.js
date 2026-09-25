// arenaNetwork.js — Thành viên 3: chế độ nhiều người chơi (Bài 2) dùng playhtml
// Biến 4 thẻ #board-1..#board-4 (TV2 dựng) thành 4 bàn OTTv2 online, dùng luật của TV1.
import {
  COLS, ICONS, NAMES,
  createInitialBoard, getMoveType, countPieces, checkWinner,
} from "./gameLogic.js";

// Test chạy ổn thì chốt cứng version (xem version thật tại https://unpkg.com/playhtml/)
const PLAYHTML_URL = "https://unpkg.com/playhtml@latest";
// Đặt tên riêng cho nhóm, tránh đụng phòng với nhóm khác copy cùng code mẫu
const ROOM = "ottv2-arena-nhom-cua-ban";
const BOARD_IDS = ["board-1", "board-2", "board-3", "board-4"];
const N = 9;
const SIDE_NAME = { blue: "Xanh", red: "Đỏ" };
const other = (s) => (s === "blue" ? "red" : "blue");

/* ============ 1. ADAPTER — chỗ DUY NHẤT phụ thuộc cách TV1 viết ============
   Giả định (PHẢI chốt với TV1):
   - board[r][c], r = 0 là hàng 9 (trên cùng), c = 0 là cột A
   - mỗi ô: null hoặc { color: "blue" | "red", type: "rock" | "paper" | "scissors" }
   Nếu TV1 viết khác, chỉ sửa 3 hàm dưới đây. */

// TV1: getMoveType(loạiQuânĐi, loạiQuânBịĐến) → "capture" nếu ăn được
function canCapture(attacker, defender) {
  return getMoveType(attacker.type, defender.type) === "capture";
}
// TV1: checkWinner(board) → "blue" | "red" | null (chấp nhận cả dạng { winner })
function winnerOf(board) {
  const w = checkWinner(board);
  const s = w && typeof w === "object" ? w.winner : w;
  return s === "blue" || s === "red" ? s : null;
}
// TV1: countPieces(board) → { blue: { rock, paper, scissors }, red: {...} }
function countsOf(board, side) {
  try { return countPieces(board)?.[side] || {}; } catch { return {}; }
}

/* ============ 2. Luật đi 1 ô / 8 hướng (hợp đồng chưa có hàm này) ============ */
function classifyMove(board, fr, fc, tr, tc) {
  if (tr < 0 || tr >= N || tc < 0 || tc >= N) return null;
  const dr = Math.abs(tr - fr), dc = Math.abs(tc - fc);
  if (dr > 1 || dc > 1 || (dr === 0 && dc === 0)) return null;
  const me = board[fr]?.[fc], target = board[tr][tc];
  if (!me) return null;
  if (!target) return "move";
  if (target.color === me.color) return null;          // không ăn quân mình
  return canCapture(me, target) ? "capture" : null;    // cùng loại / bị khắc → chặn
}
function movesFrom(board, r, c) {
  const res = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const kind = classifyMove(board, r, c, r + dr, c + dc);
      if (kind) res.push({ r: r + dr, c: c + dc, kind });
    }
  return res;
}
function hasAnyMove(board, side) {
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      if (board[r][c]?.color === side && movesFrom(board, r, c).length) return true;
  return false;
}

/* ============ 3. Danh tính người chơi (mỗi tab = 1 người) ============ */
const MY_ID = (() => {
  let id = sessionStorage.getItem("ottv2-id");
  if (!id) {
    id = crypto.randomUUID?.() ||
      Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("ottv2-id", id);
  }
  return id;
})();
function myName() {
  const v = document.getElementById("player-name")?.value?.trim();
  return (v || "Khách " + MY_ID.slice(0, 4)).slice(0, 20);
}

// Dữ liệu từ máy khác là KHÔNG tin cậy → escape trước khi đưa vào innerHTML (chống XSS)
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (ch) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const icon = (t) => (Object.hasOwn(ICONS, t) ? ICONS[t] : "?");
const pieceName = (t) => (Object.hasOwn(NAMES, t) ? NAMES[t] : esc(t));
const clone = (d) => JSON.parse(JSON.stringify(d)); // dữ liệu playhtml có thể là Proxy
const sideOf = (data) =>
  ["blue", "red"].find((s) => data?.seats?.[s]?.id === MY_ID) || null;

/* ============ 4. Trạng thái đồng bộ của 1 bàn ============ */
function freshState(seats = { blue: null, red: null }) {
  return {
    board: createInitialBoard(),
    turn: "blue",            // Xanh đi trước
    seats,                   // { blue: {id,name} | null, red: ... }
    winner: null,
    reason: "",
    moveNo: 0,
    lastMove: null,
  };
}
const selected = {};         // trạng thái CỤC BỘ (không đồng bộ): quân đang chọn mỗi bàn

/* ============ 5. Vẽ bàn (gọi mỗi khi dữ liệu mạng đổi) ============ */
function render(el, data) {
  if (!data?.board) return;
  const me = sideOf(data);
  let sel = selected[el.id];
  if (sel && data.board[sel.r]?.[sel.c]?.color !== me) sel = selected[el.id] = null;
  const hints = sel ? movesFrom(data.board, sel.r, sel.c) : [];
  const lm = data.lastMove;

  let cells = "";
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const p = data.board[r][c];
      const h = hints.find((x) => x.r === r && x.c === c);
      const cls = [
        "cell", (r + c) % 2 ? "dark" : "light",
        r === N - 1 && c === 0 ? "goal-red" : "",   // A1: đích của Đỏ
        r === 0 && c === N - 1 ? "goal-blue" : "",  // I9: đích của Xanh
        sel && sel.r === r && sel.c === c ? "selected" : "",
        h ? "hint-" + h.kind : "",
        lm && ((lm.fr === r && lm.fc === c) || (lm.tr === r && lm.tc === c)) ? "last" : "",
      ].filter(Boolean).join(" ");
      const piece = p
        ? `<span class="piece ${esc(p.color)}" title="${pieceName(p.type)}">${icon(p.type)}</span>`
        : "";
      cells += `<button class="${cls}" data-r="${r}" data-c="${c}" title="${COLS[c]}${N - r}">${piece}</button>`;
    }
  }

  const seat = (s) => {
    const o = data.seats?.[s];
    if (o) {
      const mine = o.id === MY_ID;
      return `<span class="seat ${s}${mine ? " me" : ""}">${SIDE_NAME[s]}: ${esc(o.name)}${mine ? " (bạn)" : ""}</span>`;
    }
    return me
      ? `<span class="seat ${s} empty">${SIDE_NAME[s]}: trống</span>`
      : `<button class="seat ${s}" data-act="sit-${s}">Ngồi ${SIDE_NAME[s]}</button>`;
  };
  const full = data.seats?.blue && data.seats?.red;
  const status = data.winner
    ? `🏆 ${SIDE_NAME[data.winner]} thắng${data.reason ? ": " + esc(data.reason) : ""}`
    : !full
      ? "Đang chờ đủ 2 người chơi"
      : `Lượt ${SIDE_NAME[data.turn]}${me === data.turn ? " (tới bạn)" : ""}, nước thứ ${data.moveNo + 1}`;
  const count = (s) =>
    Object.entries(countsOf(data.board, s))
      .map(([t, n]) => `${icon(t)}×${Number(n) || 0}`).join(" ");

  el.innerHTML = `
    <div class="arena-head">${seat("blue")}${seat("red")}</div>
    <div class="arena-status">${status}</div>
    <div class="arena-grid" style="display:grid;grid-template-columns:repeat(${N},1fr)">${cells}</div>
    <div class="arena-count"><span class="blue">${count("blue")}</span><span class="red">${count("red")}</span></div>
    <div class="arena-actions">
      ${me ? `<button data-act="reset">Ván mới</button><button data-act="leave">Rời ghế</button>` : ""}
      <button data-act="clear">Dọn bàn</button>
    </div>`;
}

/* ============ 6. Xử lý click (ngồi ghế, chọn quân, đi quân) ============ */
function handleClick(el, e, data, setData) {
  const t = e.target.closest("[data-act], [data-r]");
  if (!t || !el.contains(t)) return;
  const act = t.dataset.act;
  const me = sideOf(data);

  if (act === "sit-blue" || act === "sit-red") {
    const s = act.slice(4);
    if (me || data.seats?.[s]) return;               // đã ngồi / ghế có người
    const next = clone(data);
    next.seats[s] = { id: MY_ID, name: myName() };
    return setData(next);
  }
  if (act === "leave" && me) {
    const next = clone(data);
    next.seats[me] = null;
    return setData(next);
  }
  if (act === "reset" && me) return setData(freshState(clone(data.seats)));
  if (act === "clear") {
    if (confirm("Xóa ván này và giải phóng cả 2 ghế?")) setData(freshState());
    return;
  }

  if (t.dataset.r === undefined) return;
  const r = +t.dataset.r, c = +t.dataset.c;
  if (data.winner || !me || me !== data.turn) return;      // không phải lượt mình
  if (!data.seats?.blue || !data.seats?.red) return;       // chưa đủ người

  const p = data.board[r][c];
  const sel = selected[el.id];
  if (p?.color === me) {                                   // chọn / bỏ chọn quân mình
    selected[el.id] = sel && sel.r === r && sel.c === c ? null : { r, c };
    return render(el, data);
  }
  if (!sel) return;

  const kind = classifyMove(data.board, sel.r, sel.c, r, c);
  selected[el.id] = null;
  if (!kind) return render(el, data);                      // nước không hợp lệ

  const next = clone(data);
  const b = next.board;
  b[r][c] = b[sel.r][sel.c];
  b[sel.r][sel.c] = null;
  next.moveNo += 1;
  next.lastMove = { fr: sel.r, fc: sel.c, tr: r, tc: c };

  const w = winnerOf(b);
  if (w) {
    next.winner = w;
    const goal = w === "blue" ? [0, N - 1] : [N - 1, 0];
    next.reason = r === goal[0] && c === goal[1] ? "về đích" : "ăn sạch một loại quân";
  } else if (!hasAnyMove(b, other(me))) {
    next.winner = me;
    next.reason = `${SIDE_NAME[other(me)]} hết nước đi`;
  } else {
    next.turn = other(me);
  }
  setData(next);
}

/* ============ 7. Gắn playhtml ============ */
for (const id of BOARD_IDS) {
  const el = document.getElementById(id);
  if (!el) { console.error(`[arena] Không tìm thấy #${id}, kiểm tra index.html`); continue; }
  el.setAttribute("can-play", "");   // playhtml nhận diện can-play; can-ottv2 giữ cho CSS
  el.defaultData = freshState();
  el.updateElement = ({ element, data }) => render(element, data);
  el.onClick = (e, { data, setData }) => handleClick(el, e, data, setData);
}

// BẮT BUỘC import SAU khi gán defaultData. Import tĩnh bị hoist lên đầu file,
// nên phải dùng import động ở đây.
const { playhtml } = await import(PLAYHTML_URL);
playhtml.init({ room: ROOM });
