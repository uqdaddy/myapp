import { useState } from 'react';
import { Side, SideSetup, WingSetup } from './engine/types';

export interface StartConfig {
  humanSide: Side;
  humanSetup: SideSetup;
}

interface Props {
  onStart: (config: StartConfig) => void;
}

type Step = 'side' | 'formation';

const WING_LABEL: Record<WingSetup, string> = {
  'horse-outer': '마 / 상',
  'elephant-outer': '상 / 마',
};

export function SetupScreen({ onStart }: Props) {
  const [step, setStep] = useState<Step>('side');
  const [side, setSide] = useState<Side>('cho');
  const [left, setLeft] = useState<WingSetup>('horse-outer');
  const [right, setRight] = useState<WingSetup>('horse-outer');

  const stepIndex = step === 'side' ? 0 : 1;

  return (
    <div className="setup">
      <h1 className="setup-title">장기</h1>
      <p className="setup-sub">AI와 대전 · 시작 전에 설정을 골라주세요</p>

      <div className="stepper">
        {['진영', '마·상 배치'].map((label, i) => (
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
            <button
              className="btn primary"
              onClick={() =>
                onStart({
                  humanSide: side,
                  humanSetup: { left, right },
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
