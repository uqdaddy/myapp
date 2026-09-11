import { useState } from 'react';
import { Side, SideSetup, WingSetup } from './engine/types';
import { Difficulty, DIFFICULTY_SETTINGS } from './engine/fairyEngine';

export interface StartConfig {
  humanSide: Side;
  humanSetup: SideSetup;
  difficulty: Difficulty;
}

interface Props {
  onStart: (config: StartConfig) => void;
  onBack?: () => void; // return to the game-select menu
}

type Step = 'side' | 'formation' | 'difficulty';

const WING_LABEL: Record<WingSetup, string> = {
  'horse-outer': '마 / 상',
  'elephant-outer': '상 / 마',
};

const DIFF_DESC: Record<Difficulty, string> = {
  easy: '가볍게 한 판',
  normal: '적당한 상대',
  hard: '최고 실력',
};

export function SetupScreen({ onStart, onBack }: Props) {
  const [step, setStep] = useState<Step>('side');
  const [side, setSide] = useState<Side>('cho');
  const [left, setLeft] = useState<WingSetup>('horse-outer');
  const [right, setRight] = useState<WingSetup>('horse-outer');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

  const stepIndex = step === 'side' ? 0 : step === 'formation' ? 1 : 2;

  return (
    <div className="setup">
      {onBack && (
        <button className="back-link" onClick={onBack}>
          ← 게임 선택
        </button>
      )}
      <h1 className="setup-title">장기</h1>
      <p className="setup-sub">AI와 대전 · 시작 전에 설정을 골라주세요</p>
      <p className="rule-note">앱 간소화 규칙 · 빅장 대면 수 금지 · 한 수 쉼 없음 · 둘 수 없으면 패배</p>

      <div className="stepper">
        {['진영', '마·상 배치', '난이도'].map((label, i) => (
          <div
            key={label}
            className={`step-dot ${i === stepIndex ? 'active' : ''} ${
              i < stepIndex ? 'done' : ''
            }`}
          >
            <span className="step-num">{i + 1}</span>
            <span className="step-label">{label}</span>
          </div>
        ))}
      </div>

      {step === 'side' && (
        <div className="setup-card">
          <h2>진영 선택</h2>
          <p className="hint">초(楚)가 먼저 둡니다. 한(漢)을 고르면 AI가 선공합니다.</p>
          <div className="choice-grid">
            <button
              className={`choice ${side === 'cho' ? 'active' : ''}`}
              onClick={() => setSide('cho')}
            >
              <span className="choice-big cho-color">楚</span>
              <span>초 (선공)</span>
            </button>
            <button
              className={`choice ${side === 'han' ? 'active' : ''}`}
              onClick={() => setSide('han')}
            >
              <span className="choice-big han-color">漢</span>
              <span>한 (후공)</span>
            </button>
          </div>
          <div className="setup-nav">
            <button className="btn primary" onClick={() => setStep('formation')}>
              다음
            </button>
          </div>
        </div>
      )}

      {step === 'formation' && (
        <div className="setup-card">
          <h2>마·상 배치</h2>
          <p className="hint">
            내 진영 좌·우 날개에서 마(馬)와 상(象)의 순서를 정합니다. 하단 기준 왼쪽/오른쪽이에요.
          </p>

          <div className="wing-grid">
            <div className="wing-col">
              <div className="wing-head">왼쪽</div>
              {(['horse-outer', 'elephant-outer'] as WingSetup[]).map((w) => (
                <button
                  key={w}
                  className={`wing-btn ${left === w ? 'active' : ''}`}
                  onClick={() => setLeft(w)}
                >
                  {WING_LABEL[w]}
                </button>
              ))}
            </div>

            <div className="wing-col">
              <div className="wing-head">오른쪽</div>
              {(['horse-outer', 'elephant-outer'] as WingSetup[]).map((w) => (
                <button
                  key={w}
                  className={`wing-btn ${right === w ? 'active' : ''}`}
                  onClick={() => setRight(w)}
                >
                  {WING_LABEL[w]}
                </button>
              ))}
            </div>
          </div>

          <div className="setup-nav two">
            <button className="btn" onClick={() => setStep('side')}>
              이전
            </button>
            <button className="btn primary" onClick={() => setStep('difficulty')}>
              다음
            </button>
          </div>
        </div>
      )}

      {step === 'difficulty' && (
        <div className="setup-card">
          <h2>난이도</h2>
          <p className="hint">AI의 실력을 고르세요. 언제든 새 게임에서 다시 바꿀 수 있어요.</p>

          <div className="diff-list">
            {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
              <button
                key={d}
                className={`diff-btn ${difficulty === d ? 'active' : ''}`}
                onClick={() => setDifficulty(d)}
              >
                <span className="diff-name">{DIFFICULTY_SETTINGS[d].label}</span>
                <span className="diff-desc">{DIFF_DESC[d]}</span>
              </button>
            ))}
          </div>

          <div className="setup-nav two">
            <button className="btn" onClick={() => setStep('formation')}>
              이전
            </button>
            <button
              className="btn primary"
              onClick={() =>
                onStart({
                  humanSide: side,
                  humanSetup: { left, right },
                  difficulty,
                })
              }
            >
              대국 시작
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
