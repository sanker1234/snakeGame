import { useEffect, useRef, useState } from 'react'
import './App.css'

const GRID_SIZE = 18
const INITIAL_DIRECTION = { x: 1, y: 0 }
const INITIAL_SNAKE = [
  { x: 8, y: 9 },
  { x: 7, y: 9 },
  { x: 6, y: 9 },
]

const KEY_TO_DIRECTION = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
}

const getSpeed = (level) => Math.max(70, 190 - (level - 1) * 15)

const createFoodPosition = (snake) => {
  let nextFood = {
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE),
  }

  while (snake.some((segment) => segment.x === nextFood.x && segment.y === nextFood.y)) {
    nextFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    }
  }

  return nextFood
}

const buildInitialGameState = () => {
  const baseSnake = INITIAL_SNAKE.map((segment) => ({ ...segment }))

  return {
    snake: baseSnake,
    food: createFoodPosition(baseSnake),
    direction: { ...INITIAL_DIRECTION },
    queuedDirection: { ...INITIAL_DIRECTION },
    score: 0,
    level: 1,
    status: 'idle',
  }
}

function App() {
  const [snake, setSnake] = useState(() => INITIAL_SNAKE.map((segment) => ({ ...segment })))
  const [food, setFood] = useState(() => createFoodPosition(INITIAL_SNAKE))
  const [direction, setDirection] = useState({ ...INITIAL_DIRECTION })
  const [queuedDirection, setQueuedDirection] = useState({ ...INITIAL_DIRECTION })
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [status, setStatus] = useState('idle')
  const [highScore, setHighScore] = useState(() => {
    const storedScore = Number(window.localStorage.getItem('snake-high-score') || 0)
    return Number.isFinite(storedScore) ? storedScore : 0
  })

  const directionRef = useRef(direction)
  const queuedDirectionRef = useRef(queuedDirection)
  const snakeRef = useRef(snake)
  const scoreRef = useRef(score)
  const foodRef = useRef(food)
  const levelRef = useRef(level)
  const statusRef = useRef(status)

  useEffect(() => {
    directionRef.current = direction
  }, [direction])

  useEffect(() => {
    queuedDirectionRef.current = queuedDirection
  }, [queuedDirection])

  useEffect(() => {
    snakeRef.current = snake
  }, [snake])

  useEffect(() => {
    scoreRef.current = score
  }, [score])

  useEffect(() => {
    foodRef.current = food
  }, [food])

  useEffect(() => {
    levelRef.current = level
  }, [level])

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    const storedScore = Number(window.localStorage.getItem('snake-high-score') || 0)
    if (Number.isFinite(storedScore)) {
      setHighScore(storedScore)
    }
  }, [])

  const syncHighScore = (nextScore) => {
    setHighScore((previousHighScore) => {
      const updatedHighScore = Math.max(previousHighScore, nextScore)
      window.localStorage.setItem('snake-high-score', String(updatedHighScore))
      return updatedHighScore
    })
  }

  const resetGame = (nextStatus = 'idle') => {
    const freshSnake = INITIAL_SNAKE.map((segment) => ({ ...segment }))
    const freshFood = createFoodPosition(freshSnake)

    setSnake(freshSnake)
    setFood(freshFood)
    setDirection({ ...INITIAL_DIRECTION })
    setQueuedDirection({ ...INITIAL_DIRECTION })
    setScore(0)
    setLevel(1)
    setStatus(nextStatus)
  }

  const handleDirectionInput = (nextDirection) => {
    const currentDirection = directionRef.current

    if (
      nextDirection.x === -currentDirection.x &&
      nextDirection.y === -currentDirection.y
    ) {
      return
    }

    if (statusRef.current === 'gameover') {
      return
    }

    setQueuedDirection(nextDirection)

    if (statusRef.current === 'idle') {
      setStatus('playing')
    }
  }

  const handleStart = () => {
    setStatus('playing')
  }

  const handlePause = () => {
    if (status === 'playing') {
      setStatus('paused')
    }
  }

  const handleResume = () => {
    if (status === 'paused') {
      setStatus('playing')
    }
  }

  const handleRestart = () => {
    resetGame('playing')
  }

  useEffect(() => {
    const handleKeyDown = (event) => {
      const directionKey = KEY_TO_DIRECTION[event.key] || KEY_TO_DIRECTION[event.key.toLowerCase()]

      if (!directionKey) {
        return
      }

      event.preventDefault()
      handleDirectionInput(directionKey)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (status !== 'playing') {
      return undefined
    }

    const tick = () => {
      const activeDirection = queuedDirectionRef.current
      const currentSnake = snakeRef.current
      const currentFood = foodRef.current
      const currentScore = scoreRef.current
      const nextHead = {
        x: currentSnake[0].x + activeDirection.x,
        y: currentSnake[0].y + activeDirection.y,
      }

      const hitsWall =
        nextHead.x < 0 ||
        nextHead.x >= GRID_SIZE ||
        nextHead.y < 0 ||
        nextHead.y >= GRID_SIZE

      const willEatFood = nextHead.x === currentFood.x && nextHead.y === currentFood.y
      const bodyToCheck = currentSnake.slice(0, willEatFood ? currentSnake.length : currentSnake.length - 1)
      const hitsBody = bodyToCheck.some(
        (segment) => segment.x === nextHead.x && segment.y === nextHead.y,
      )

      if (hitsWall || hitsBody) {
        setStatus('gameover')
        return
      }

      const updatedSnake = [nextHead, ...currentSnake]
      let updatedScore = currentScore
      let updatedLevel = levelRef.current
      let updatedFood = currentFood

      if (willEatFood) {
        updatedScore += 1
        updatedLevel = Math.floor(updatedScore / 5) + 1
        updatedFood = createFoodPosition(updatedSnake)
        syncHighScore(updatedScore)
      } else {
        updatedSnake.pop()
      }

      setSnake(updatedSnake)
      setFood(updatedFood)
      setDirection(activeDirection)
      setQueuedDirection(activeDirection)
      setScore(updatedScore)
      setLevel(updatedLevel)
    }

    const intervalId = window.setInterval(tick, getSpeed(level))

    return () => {
      window.clearInterval(intervalId)
    }
  }, [status, level])

  const boardCells = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
    const x = index % GRID_SIZE
    const y = Math.floor(index / GRID_SIZE)
    const isFood = food.x === x && food.y === y
    const isHead = snake[0].x === x && snake[0].y === y
    const isBody = snake.some((segment, segmentIndex) => {
      if (segmentIndex === 0) {
        return false
      }

      return segment.x === x && segment.y === y
    })

    return {
      key: `${x}-${y}`,
      isFood,
      isHead,
      isBody,
    }
  })

  const statusLabel =
    status === 'idle'
      ? 'Ready'
      : status === 'playing'
        ? 'Running'
        : status === 'paused'
          ? 'Paused'
          : 'Game Over'

  return (
    <div className="app-shell">
      <div className="game-card">
        <header className="top-bar">
          <div className="stat-block">
            <span className="label">Score</span>
            <strong>{score}</strong>
          </div>
          <div className="stat-block">
            <span className="label">High Score</span>
            <strong>{highScore}</strong>
          </div>
          <div className="stat-block">
            <span className="label">Level</span>
            <strong>{level}</strong>
          </div>
          <div className="stat-block status-block">
            <span className="label">Status</span>
            <strong className={`status-text ${status}`}>{statusLabel}</strong>
          </div>
        </header>

        <div className="controls-row">
          <button type="button" className="primary-button" onClick={handleStart}>
            Start
          </button>
          <button type="button" className="secondary-button" onClick={handlePause}>
            Pause
          </button>
          <button type="button" className="secondary-button" onClick={handleResume}>
            Resume
          </button>
          <button type="button" className="secondary-button danger" onClick={handleRestart}>
            Restart
          </button>
        </div>

        <div className="board-wrap">
          <div className="game-board" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}>
            {boardCells.map((cell) => (
              <div
                key={cell.key}
                className={[
                  'board-cell',
                  cell.isFood ? 'food' : '',
                  cell.isHead ? 'snake-head' : '',
                  cell.isBody ? 'snake-body' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            ))}

            {status === 'gameover' && (
              <div className="game-over-overlay" role="dialog" aria-modal="true">
                <div className="game-over-card">
                  <p className="over-title">Game Over</p>
                  <h2>Final Score: {score}</h2>
                  <button type="button" className="primary-button" onClick={handleRestart}>
                    Restart Game
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="touch-controls" aria-label="Directional pad">
          <div className="dpad">
            <button type="button" className="pad-button up" onClick={() => handleDirectionInput({ x: 0, y: -1 })}>
              ↑
            </button>
            <button type="button" className="pad-button left" onClick={() => handleDirectionInput({ x: -1, y: 0 })}>
              ←
            </button>
            <button type="button" className="pad-button right" onClick={() => handleDirectionInput({ x: 1, y: 0 })}>
              →
            </button>
            <button type="button" className="pad-button down" onClick={() => handleDirectionInput({ x: 0, y: 1 })}>
              ↓
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
