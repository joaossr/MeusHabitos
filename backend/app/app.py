from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
from pathlib import Path
from datetime import datetime, date

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "habitos.db"

app = Flask(__name__)
CORS(app)

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def now():
    return datetime.now().isoformat(timespec="seconds")

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = get_db()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        avatar TEXT DEFAULT '',
        daily_xp INTEGER NOT NULL DEFAULT 100,
        timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        archived INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, name)
    );

    CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        category_id INTEGER,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        strategy TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'not_started',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS habits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        icon TEXT DEFAULT '✓',
        category_id INTEGER,
        goal_id INTEGER,
        color TEXT DEFAULT '',
        frequency TEXT NOT NULL DEFAULT 'daily',
        frequency_config TEXT DEFAULT '{}',
        difficulty TEXT NOT NULL DEFAULT 'medium',
        xp INTEGER NOT NULL DEFAULT 20,
        reminder_time TEXT DEFAULT '',
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        archived INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS habit_completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        habit_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        completion_date TEXT NOT NULL,
        xp INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(habit_id, completion_date),
        FOREIGN KEY(habit_id) REFERENCES habits(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS milestones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        weight REAL NOT NULL DEFAULT 1,
        due_date TEXT,
        done INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS xp_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        xp INTEGER NOT NULL,
        reason TEXT NOT NULL,
        reference_type TEXT,
        reference_id INTEGER,
        transaction_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_achievements (
        user_id INTEGER NOT NULL,
        achievement_id INTEGER NOT NULL,
        unlocked_at TEXT NOT NULL,
        PRIMARY KEY(user_id, achievement_id),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS missions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        mission_type TEXT NOT NULL,
        reward_xp INTEGER NOT NULL,
        active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS user_missions (
        user_id INTEGER NOT NULL,
        mission_id INTEGER NOT NULL,
        mission_date TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT,
        PRIMARY KEY(user_id, mission_id, mission_date),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(mission_id) REFERENCES missions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
    CREATE INDEX IF NOT EXISTS idx_completions_user_date ON habit_completions(user_id, completion_date);
    CREATE INDEX IF NOT EXISTS idx_xp_user_date ON xp_transactions(user_id, transaction_date);
    """)

    cur = conn.execute("SELECT id FROM users LIMIT 1")
    if cur.fetchone() is None:
        t = now()
        cur = conn.execute(
            "INSERT INTO users(name, avatar, daily_xp, created_at, updated_at) VALUES(?,?,?,?,?)",
            ("Usuário", "US", 100, t, t)
        )
        user_id = cur.lastrowid
        categories = ["Saúde", "Estudos", "Pessoal", "Trabalho", "Lazer"]
        for i, name in enumerate(categories):
            conn.execute(
                "INSERT INTO categories(user_id,name,sort_order,created_at) VALUES(?,?,?,?)",
                (user_id, name, i, t)
            )

    achievements = [
        ("first", "Primeiro passo", "Conclua seu primeiro hábito", "🌱"),
        ("xp100", "100 XP", "Acumule 100 XP", "⭐"),
        ("streak7", "7 dias", "Mantenha 7 dias de streak", "🔥"),
        ("streak30", "30 dias", "Mantenha 30 dias de streak", "🔥"),
        ("goal1", "Primeira meta", "Conclua uma meta", "🎯"),
        ("five", "Cinco ativos", "Tenha 5 hábitos ativos", "✋"),
        ("hundred", "Centena", "Complete 100 hábitos", "💯"),
        ("consistent", "Consistente", "Alcance 90% de consistência", "📈"),
    ]
    for a in achievements:
        conn.execute(
            "INSERT OR IGNORE INTO achievements(code,name,description,icon) VALUES(?,?,?,?)", a
        )

    missions = [
        ("daily_3", "Complete 3 hábitos hoje", "Complete pelo menos 3 hábitos no dia.", "daily", 50),
        ("weekly_80", "80% de consistência", "Mantenha 80% de consistência na semana.", "weekly", 150),
    ]
    for m in missions:
        conn.execute(
            "INSERT OR IGNORE INTO missions(code,title,description,mission_type,reward_xp) VALUES(?,?,?,?,?)", m
        )

    conn.commit()
    conn.close()

def user_id():
    # Versão local: existe apenas um usuário.
    conn = get_db()
    row = conn.execute("SELECT id FROM users LIMIT 1").fetchone()
    conn.close()
    return row["id"]

def rowdict(row):
    return dict(row) if row else None

@app.get("/api/health")
def health():
    return jsonify({"ok": True, "database": str(DB_PATH), "status": "ready"})

@app.get("/api/dashboard")
def dashboard():
    uid = user_id()
    conn = get_db()
    user = rowdict(conn.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone())
    habits = [dict(x) for x in conn.execute(
        "SELECT * FROM habits WHERE user_id=? AND archived=0 ORDER BY sort_order,id", (uid,)
    ).fetchall()]
    goals = [dict(x) for x in conn.execute(
        "SELECT * FROM goals WHERE user_id=? ORDER BY id DESC", (uid,)
    ).fetchall()]
    total_xp = conn.execute(
        "SELECT COALESCE(SUM(xp),0) total FROM xp_transactions WHERE user_id=?", (uid,)
    ).fetchone()["total"]
    today = date.today().isoformat()
    done_today = conn.execute(
        "SELECT COUNT(*) total FROM habit_completions WHERE user_id=? AND completion_date=?",
        (uid, today)
    ).fetchone()["total"]
    conn.close()
    return jsonify({
        "user": user,
        "habits": habits,
        "goals": goals,
        "xp": total_xp,
        "completed_today": done_today,
        "today": today
    })

@app.get("/api/habits")
def get_habits():
    uid = user_id()
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM habits WHERE user_id=? ORDER BY archived,sort_order,id", (uid,)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.post("/api/habits")
def create_habit():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name","")).strip()
    if not name:
        return jsonify({"error":{"code":"VALIDATION","message":"Nome do hábito é obrigatório."}}), 400
    uid = user_id()
    t = now()
    conn = get_db()
    cur = conn.execute("""
      INSERT INTO habits
      (user_id,name,description,icon,category_id,goal_id,color,frequency,frequency_config,
       difficulty,xp,reminder_time,start_date,end_date,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        uid, name, data.get("description",""), data.get("icon","✓"),
        data.get("category_id"), data.get("goal_id"), data.get("color",""),
        data.get("frequency","daily"), data.get("frequency_config","{}"),
        data.get("difficulty","medium"), max(1,int(data.get("xp",20))),
        data.get("reminder_time",""), data.get("start_date","2026-09-08"),
        data.get("end_date","2026-12-31"), t, t
    ))
    conn.commit()
    row = conn.execute("SELECT * FROM habits WHERE id=?", (cur.lastrowid,)).fetchone()
    conn.close()
    return jsonify(dict(row)), 201

@app.put("/api/habits/<int:hid>")
def update_habit(hid):
    data = request.get_json(silent=True) or {}
    uid = user_id()
    conn = get_db()
    existing = conn.execute("SELECT id FROM habits WHERE id=? AND user_id=?", (hid,uid)).fetchone()
    if not existing:
        conn.close()
        return jsonify({"error":{"code":"NOT_FOUND","message":"Hábito não encontrado."}}), 404
    allowed = ["name","description","icon","category_id","goal_id","color","frequency",
               "frequency_config","difficulty","xp","reminder_time","start_date","end_date",
               "archived","sort_order"]
    sets=[]; vals=[]
    for key in allowed:
        if key in data:
            sets.append(f"{key}=?")
            vals.append(data[key])
    if not sets:
        conn.close()
        return jsonify({"error":{"code":"NO_CHANGES","message":"Nenhuma alteração enviada."}}), 400
    sets.append("updated_at=?"); vals.append(now()); vals.extend([hid,uid])
    conn.execute(f"UPDATE habits SET {','.join(sets)} WHERE id=? AND user_id=?", vals)
    conn.commit()
    row=conn.execute("SELECT * FROM habits WHERE id=?", (hid,)).fetchone()
    conn.close()
    return jsonify(dict(row))

@app.delete("/api/habits/<int:hid>")
def delete_habit(hid):
    uid=user_id()
    conn=get_db()
    cur=conn.execute("DELETE FROM habits WHERE id=? AND user_id=?", (hid,uid))
    conn.commit(); conn.close()
    if cur.rowcount==0:
        return jsonify({"error":{"code":"NOT_FOUND","message":"Hábito não encontrado."}}),404
    return jsonify({"success":True})

@app.post("/api/habits/<int:hid>/complete")
def complete_habit(hid):
    data=request.get_json(silent=True) or {}
    completion_date=data.get("date") or date.today().isoformat()
    uid=user_id()
    conn=get_db()
    h=conn.execute("SELECT * FROM habits WHERE id=? AND user_id=? AND archived=0",(hid,uid)).fetchone()
    if not h:
        conn.close()
        return jsonify({"error":{"code":"NOT_FOUND","message":"Hábito não encontrado."}}),404
    exists=conn.execute("SELECT id FROM habit_completions WHERE habit_id=? AND completion_date=?",(hid,completion_date)).fetchone()
    if exists:
        conn.close()
        return jsonify({"success":True,"already_completed":True,"message":"Este hábito já foi concluído neste dia."})
    t=now()
    try:
        conn.execute("BEGIN")
        conn.execute(
            "INSERT INTO habit_completions(habit_id,user_id,completion_date,xp,created_at) VALUES(?,?,?,?,?)",
            (hid,uid,completion_date,h["xp"],t)
        )
        conn.execute(
            "INSERT INTO xp_transactions(user_id,xp,reason,reference_type,reference_id,transaction_date,created_at) VALUES(?,?,?,?,?,?,?)",
            (uid,h["xp"],f'Hábito: {h["name"]}',"habit",hid,completion_date,t)
        )
        conn.commit()
    except Exception:
        conn.rollback(); conn.close()
        return jsonify({"error":{"code":"TRANSACTION_FAILED","message":"Não foi possível concluir o hábito."}}),500
    conn.close()
    return jsonify({"success":True,"xp_added":h["xp"],"date":completion_date})

@app.delete("/api/habits/<int:hid>/complete")
def undo_habit(hid):
    data=request.get_json(silent=True) or {}
    completion_date=data.get("date") or date.today().isoformat()
    uid=user_id()
    conn=get_db()
    h=conn.execute("SELECT * FROM habits WHERE id=? AND user_id=?",(hid,uid)).fetchone()
    if not h:
        conn.close()
        return jsonify({"error":{"code":"NOT_FOUND","message":"Hábito não encontrado."}}),404
    c=conn.execute("SELECT xp FROM habit_completions WHERE habit_id=? AND completion_date=?",(hid,completion_date)).fetchone()
    if not c:
        conn.close()
        return jsonify({"success":True,"already_undone":True})
    t=now()
    try:
        conn.execute("BEGIN")
        conn.execute("DELETE FROM habit_completions WHERE habit_id=? AND completion_date=?",(hid,completion_date))
        conn.execute(
            "INSERT INTO xp_transactions(user_id,xp,reason,reference_type,reference_id,transaction_date,created_at) VALUES(?,?,?,?,?,?,?)",
            (uid,-c["xp"],f'Desfazer: {h["name"]}',"habit_undo",hid,completion_date,t)
        )
        conn.commit()
    except Exception:
        conn.rollback(); conn.close()
        return jsonify({"error":{"code":"TRANSACTION_FAILED","message":"Não foi possível desfazer."}}),500
    conn.close()
    return jsonify({"success":True,"xp_removed":c["xp"]})

@app.get("/api/completions")
def completions():
    uid=user_id()
    conn=get_db()
    rows=conn.execute("SELECT * FROM habit_completions WHERE user_id=? ORDER BY completion_date DESC",(uid,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.get("/api/goals")
def get_goals():
    uid=user_id()
    conn=get_db()
    goals=conn.execute("SELECT * FROM goals WHERE user_id=? ORDER BY id DESC",(uid,)).fetchall()
    result=[]
    for g in goals:
        d=dict(g)
        d["milestones"]=[dict(m) for m in conn.execute("SELECT * FROM milestones WHERE goal_id=? ORDER BY id",(g["id"],)).fetchall()]
        d["habits"]=[dict(h) for h in conn.execute("SELECT id,name,xp FROM habits WHERE goal_id=? AND archived=0 ORDER BY id",(g["id"],)).fetchall()]
        result.append(d)
    conn.close()
    return jsonify(result)

@app.post("/api/goals")
def create_goal():
    data=request.get_json(silent=True) or {}
    title=str(data.get("title","")).strip()
    start=data.get("start_date","2026-09-08")
    end=data.get("end_date","2026-12-31")
    if not title:
        return jsonify({"error":{"code":"VALIDATION","message":"Título da meta é obrigatório."}}),400
    if start<"2026-09-08" or end>"2026-12-31" or end<start:
        return jsonify({"error":{"code":"INVALID_PERIOD","message":"A meta deve estar entre 08/09/2026 e 31/12/2026."}}),400
    uid=user_id();t=now();conn=get_db()
    cur=conn.execute("""
      INSERT INTO goals(user_id,title,description,category_id,start_date,end_date,strategy,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?)
    """,(uid,title,data.get("description",""),data.get("category_id"),start,end,data.get("strategy",""),t,t))
    gid=cur.lastrowid
    for m in data.get("milestones",[]):
        conn.execute("INSERT INTO milestones(goal_id,title,description,weight,due_date,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
                     (gid,m.get("title","Marco"),m.get("description",""),float(m.get("weight",1)),m.get("due_date"),t,t))
    conn.commit()
    row=conn.execute("SELECT * FROM goals WHERE id=?",(gid,)).fetchone()
    conn.close()
    return jsonify(dict(row)),201

@app.put("/api/goals/<int:gid>")
def update_goal(gid):
    data=request.get_json(silent=True) or {}
    uid=user_id();conn=get_db()
    row=conn.execute("SELECT * FROM goals WHERE id=? AND user_id=?",(gid,uid)).fetchone()
    if not row:
        conn.close();return jsonify({"error":{"code":"NOT_FOUND","message":"Meta não encontrada."}}),404
    allowed=["title","description","category_id","start_date","end_date","strategy","status"]
    sets=[];vals=[]
    for k in allowed:
        if k in data:
            sets.append(f"{k}=?");vals.append(data[k])
    if "start_date" in data or "end_date" in data:
        s=data.get("start_date",row["start_date"]);e=data.get("end_date",row["end_date"])
        if s<"2026-09-08" or e>"2026-12-31" or e<s:
            conn.close();return jsonify({"error":{"code":"INVALID_PERIOD","message":"Período inválido."}}),400
    if not sets:
        conn.close();return jsonify({"error":{"code":"NO_CHANGES","message":"Nenhuma alteração enviada."}}),400
    sets.append("updated_at=?");vals.append(now());vals.extend([gid,uid])
    conn.execute(f"UPDATE goals SET {','.join(sets)} WHERE id=? AND user_id=?",vals)
    conn.commit();r=conn.execute("SELECT * FROM goals WHERE id=?",(gid,)).fetchone();conn.close()
    return jsonify(dict(r))

@app.delete("/api/goals/<int:gid>")
def delete_goal(gid):
    uid=user_id();conn=get_db()
    cur=conn.execute("DELETE FROM goals WHERE id=? AND user_id=?",(gid,uid));conn.commit();conn.close()
    if cur.rowcount==0:return jsonify({"error":{"code":"NOT_FOUND","message":"Meta não encontrada."}}),404
    return jsonify({"success":True})

@app.get("/api/xp/history")
def xp_history():
    uid=user_id();conn=get_db()
    rows=conn.execute("SELECT * FROM xp_transactions WHERE user_id=? ORDER BY created_at DESC",(uid,)).fetchall()
    conn.close();return jsonify([dict(r) for r in rows])

@app.get("/api/profile")
def profile():
    uid=user_id();conn=get_db()
    r=conn.execute("SELECT * FROM users WHERE id=?",(uid,)).fetchone();conn.close()
    return jsonify(dict(r))

@app.put("/api/profile")
def update_profile():
    data=request.get_json(silent=True) or {};uid=user_id()
    conn=get_db()
    conn.execute("UPDATE users SET name=?,avatar=?,daily_xp=?,timezone=?,updated_at=? WHERE id=?",
                 (data.get("name","Usuário").strip() or "Usuário",data.get("avatar",""),max(1,int(data.get("daily_xp",100))),data.get("timezone","America/Sao_Paulo"),now(),uid))
    conn.commit();r=conn.execute("SELECT * FROM users WHERE id=?",(uid,)).fetchone();conn.close()
    return jsonify(dict(r))

if __name__=="__main__":
    init_db()
    app.run(host="127.0.0.1",port=8000,debug=True)
