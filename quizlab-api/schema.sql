CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quizzes_user_idx ON quizzes(user_id);

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  qtype TEXT NOT NULL DEFAULT 'mc' CHECK (qtype IN ('mc', 'tf')),
  duration INT NOT NULL DEFAULT 10 CHECK (duration BETWEEN 5 AND 120),
  image_url TEXT NOT NULL DEFAULT '',
  explanation TEXT NOT NULL DEFAULT '',
  order_number INT NOT NULL
);
CREATE INDEX IF NOT EXISTS questions_quiz_idx ON questions(quiz_id);

CREATE TABLE IF NOT EXISTS answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  order_number INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS answers_question_idx ON answers(question_id);

CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  current_question INT NOT NULL DEFAULT 0,
  current_phase TEXT NOT NULL DEFAULT 'lobby',
  is_paused BOOLEAN NOT NULL DEFAULT false,
  question_started_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- kode hanya unik di antara sesi yang masih aktif (sesuai PRD)
CREATE UNIQUE INDEX IF NOT EXISTS game_sessions_active_code
  ON game_sessions(game_code) WHERE status <> 'finished';

CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  token TEXT NOT NULL,
  total_score INT NOT NULL DEFAULT 0,
  streak INT NOT NULL DEFAULT 0,
  max_streak INT NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- nama unik per sesi, tanpa membedakan huruf besar/kecil
CREATE UNIQUE INDEX IF NOT EXISTS participants_session_nick
  ON participants(session_id, lower(nickname));

CREATE TABLE IF NOT EXISTS participant_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_answer_id UUID REFERENCES answers(id) ON DELETE SET NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  response_time INT NOT NULL DEFAULT 0,
  score INT NOT NULL DEFAULT 0,
  -- satu jawaban per peserta per pertanyaan (PRD 7.2)
  UNIQUE (participant_id, question_id)
);