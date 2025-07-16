import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Trophy, Play, Pause, RotateCcw, X } from 'lucide-react';

const GoldenCoinCatcher = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState('menu'); // menu, playing, paused, gameOver
  const [coins, setCoins] = useState([]);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [couponUnlocked, setCouponUnlocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [highScore, setHighScore] = useState(0);

  // 코인 생성 함수
  const createCoin = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    return {
      id: Math.random(),
      x: Math.random() * (canvas.width - 40) + 20,
      y: Math.random() * (canvas.height - 40) + 20,
      size: 40,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      rotation: 0,
      rotationSpeed: 0.1,
      pulse: 0
    };
  }, []);

  // 게임 시작
  const startGame = () => {
    setScore(0);
    setTimeLeft(60);
    setCouponUnlocked(false);
    setCoins([]);
    setGameState('playing');

    // 초기 코인 생성
    const initialCoins = [];
    for (let i = 0; i < 3; i++) {
      initialCoins.push(createCoin());
    }
    setCoins(initialCoins);
  };

  // 게임 종료
  const endGame = () => {
    setGameState('gameOver');
    if (score > highScore) {
      setHighScore(score);
    }
    setShowNameModal(true);
  };

  // 코인 클릭 처리
  const handleCanvasClick = (event) => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setCoins(prevCoins => {
      const newCoins = [...prevCoins];
      for (let i = newCoins.length - 1; i >= 0; i--) {
        const coin = newCoins[i];
        const distance = Math.sqrt((x - coin.x) ** 2 + (y - coin.y) ** 2);

        if (distance < coin.size / 2) {
          newCoins.splice(i, 1);
          setScore(prev => prev + 50);

          // 새 코인 생성
          if (newCoins.length < 5) {
            newCoins.push(createCoin());
          }
          break;
        }
      }
      return newCoins;
    });
  };

  // 기록 저장
  const saveScore = () => {
    if (playerName.trim()) {
      const newScore = {
        name: playerName.trim(),
        score: score,
        date: new Date().toLocaleDateString(),
        coupon: couponUnlocked
      };

      setLeaderboard(prev => {
        const updated = [...prev, newScore].sort((a, b) => b.score - a.score).slice(0, 10);
        return updated;
      });

      setPlayerName('');
      setShowNameModal(false);
    }
  };

  // 게임 루프
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let currentCoins = coins;

    const animate = () => {
      // 캔버스 클리어
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 배경 그라디언트
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 코인 업데이트 및 렌더링
      const updatedCoins = currentCoins.map(coin => {
        // 코인 움직임
        coin.x += coin.vx;
        coin.y += coin.vy;

        // 벽 충돌
        if (coin.x <= 20 || coin.x >= canvas.width - 20) {
          coin.vx *= -1;
        }
        if (coin.y <= 20 || coin.y >= canvas.height - 20) {
          coin.vy *= -1;
        }

        // 회전 및 펄스 효과
        coin.rotation += coin.rotationSpeed;
        coin.pulse += 0.1;

        // 코인 그리기
        ctx.save();
        ctx.translate(coin.x, coin.y);
        ctx.rotate(coin.rotation);

        const pulseSize = coin.size + Math.sin(coin.pulse) * 3;

        // 외곽 글로우
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 15;

        // 코인 본체
        const coinGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, pulseSize / 2);
        coinGradient.addColorStop(0, '#FFD700');
        coinGradient.addColorStop(0.7, '#FFA500');
        coinGradient.addColorStop(1, '#FF8C00');

        ctx.fillStyle = coinGradient;
        ctx.beginPath();
        ctx.arc(0, 0, pulseSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // 내부 하이라이트
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FFFF99';
        ctx.beginPath();
        ctx.arc(-5, -5, pulseSize / 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        return coin;
      });

      currentCoins = updatedCoins;

      if (gameState === 'playing') {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, coins]);

  // 타이머
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // 쿠폰 체크
  useEffect(() => {
    if (score >= 1000 && !couponUnlocked) {
      setCouponUnlocked(true);
    }
  }, [score, couponUnlocked]);

  // 코인 자동 생성
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      setCoins(prevCoins => {
        if (prevCoins.length < 5) {
          return [...prevCoins, createCoin()];
        }
        return prevCoins;
      });
    }, 2400);

    return () => clearInterval(interval);
  }, [gameState, createCoin]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="relative">
        {/* 게임 UI */}
        <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
          <div className="text-2xl font-bold text-gray-800 mb-2">점수: {score}</div>
          <div className="text-lg text-blue-600 mb-2">시간: {timeLeft}초</div>
          <div className="text-sm text-gray-600">최고점수: {highScore}</div>
          {couponUnlocked && (
            <div className="text-red-600 font-bold mt-2 animate-pulse">
              🎉 쿠폰 획득!
            </div>
          )}
        </div>

        {/* 게임 컨트롤 */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button
            onClick={() => setShowLeaderboard(true)}
            className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded-lg shadow-lg transition-colors"
          >
            <Trophy size={20} />
          </button>

          {gameState === 'playing' && (
            <button
              onClick={() => setGameState('paused')}
              className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-lg shadow-lg transition-colors"
            >
              <Pause size={20} />
            </button>
          )}

          {gameState === 'paused' && (
            <button
              onClick={() => setGameState('playing')}
              className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg shadow-lg transition-colors"
            >
              <Play size={20} />
            </button>
          )}

          <button
            onClick={startGame}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg shadow-lg transition-colors"
          >
            <RotateCcw size={20} />
          </button>
        </div>

        {/* 게임 캔버스 */}
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onClick={handleCanvasClick}
          className="border-4 border-white/30 rounded-xl shadow-2xl cursor-pointer"
        />

        {/* 게임 시작 화면 */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-xl">
            <div className="text-center text-white">
              <h1 className="text-6xl font-bold mb-4 text-yellow-400">🪙</h1>
              <h2 className="text-4xl font-bold mb-8">Golden Coin Catcher</h2>
              <p className="text-xl mb-8 text-gray-300">60초 안에 최대한 많은 코인을 잡아보세요!</p>
              <button
                onClick={startGame}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-4 rounded-lg text-xl font-bold shadow-lg transition-colors"
              >
                게임 시작
              </button>
            </div>
          </div>
        )}

        {/* 일시정지 화면 */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-xl">
            <div className="text-center text-white">
              <h2 className="text-4xl font-bold mb-8">게임 일시정지</h2>
              <button
                onClick={() => setGameState('playing')}
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg text-xl font-bold shadow-lg transition-colors"
              >
                계속하기
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 이름 입력 모달 */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">게임 종료!</h3>
              <p className="text-4xl font-bold text-yellow-500 mb-2">{score}점</p>
              {couponUnlocked && (
                <p className="text-red-600 font-bold">🎉 쿠폰도 획득하셨습니다!</p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 font-bold mb-2">이름을 입력하세요:</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="플레이어 이름"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={20}
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={saveScore}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-bold transition-colors"
              >
                기록 저장
              </button>
              <button
                onClick={() => setShowNameModal(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg font-bold transition-colors"
              >
                나중에
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 리더보드 모달 */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">🏆 리더보드</h3>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            {leaderboard.length === 0 ? (
              <p className="text-gray-500 text-center py-8">아직 기록이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((record, index) => (
                  <div key={index} className={`p-4 rounded-lg border-2 ${index === 0 ? 'border-yellow-400 bg-yellow-50' :
                      index === 1 ? 'border-gray-400 bg-gray-50' :
                        index === 2 ? 'border-orange-400 bg-orange-50' :
                          'border-gray-200 bg-gray-50'
                    }`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold text-lg">
                          {index + 1}. {record.name}
                          {record.coupon && <span className="text-red-500 ml-2">🎫</span>}
                        </div>
                        <div className="text-sm text-gray-600">{record.date}</div>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {record.score}점
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoldenCoinCatcher;