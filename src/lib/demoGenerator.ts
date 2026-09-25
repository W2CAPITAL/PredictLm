import type { GeneratedFile } from '../types'

function wrapFile(path: string, content: string): string {
  return '```tsx\n// ' + path + '\n' + content + '\n```'
}

function todoApp(prompt: string): string {
  const appContent = `function App() {
  const [todos, setTodos] = useState([])
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState('all')
  const [darkMode, setDarkMode] = useState(true)

  const addTodo = () => {
    if (!input.trim()) return
    setTodos([...todos, { id: Date.now(), text: input, done: false }])
    setInput('')
  }

  const toggleTodo = (id) => {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const deleteTodo = (id) => {
    setTodos(todos.filter(t => t.id !== id))
  }

  const filtered = todos.filter(t => filter === 'all' ? true : filter === 'active' ? !t.done : t.done)

  return (
    <div className={darkMode ? 'min-h-screen bg-gray-900 text-white' : 'min-h-screen bg-gray-50 text-gray-900'}>
      <div className="max-w-md mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Todo List</h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg bg-opacity-20 border border-current border-opacity-20 hover:bg-opacity-10 transition-all"
          >
            {darkMode ? '\\u2600\\uFE0F' : '\\u{1F319}'}
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            placeholder="Add a new todo..."
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            onClick={addTodo}
            className="px-4 py-2.5 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            Add
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {['all', 'active', 'done'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={filter === f ? 'px-3 py-1 rounded-md text-sm font-medium bg-blue-500 text-white' : 'px-3 py-1 rounded-md text-sm font-medium bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-8">No todos yet. Add one above!</p>
          )}
          {filtered.map(todo => (
            <div
              key={todo.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 transition-all group"
            >
              <button
                onClick={() => toggleTodo(todo.id)}
                className={todo.done ? 'w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs' : 'w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600'}
              >
                {todo.done && '\\u2713'}
              </button>
              <span className={todo.done ? 'flex-1 line-through text-gray-400' : 'flex-1'}>{todo.text}</span>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-all text-sm"
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          {todos.filter(t => !t.done).length} items left
        </p>
      </div>
    </div>
  )
`

  return wrapFile('App.tsx', appContent)
}

function landingApp(prompt: string): string {
  const appContent = `function App() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-900 via-amber-800 to-orange-900 text-white">
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">\\u2615</span>
          <span className="text-xl font-bold">Brew & Bean</span>
        </div>
        <div className="hidden md:flex gap-8">
          <a href="#menu" className="hover:text-amber-300 transition-colors">Menu</a>
          <a href="#about" className="hover:text-amber-300 transition-colors">About</a>
          <a href="#contact" className="hover:text-amber-300 transition-colors">Contact</a>
        </div>
        <button className="hidden md:block px-4 py-2 rounded-full bg-amber-300 text-amber-900 font-medium hover:bg-amber-200 transition-colors">
          Order Now
        </button>
      </nav>

      <header className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-4">Fresh Coffee, Every Morning</h1>
        <p className="text-xl text-amber-100 mb-8 max-w-xl mx-auto">
          Hand-crafted coffee made from the finest beans, roasted to perfection.
        </p>
        <div className="flex gap-4 justify-center">
          <button className="px-8 py-3 rounded-full bg-amber-300 text-amber-900 font-semibold hover:bg-amber-200 transition-colors">
            Explore Menu
          </button>
          <button className="px-8 py-3 rounded-full border-2 border-amber-300 text-amber-300 font-semibold hover:bg-amber-300 hover:text-amber-900 transition-all">
            Our Story
          </button>
        </div>
      </header>

      <section id="menu" className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold mb-8 text-center">Our Specialties</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: 'Espresso', price: '$3.50', desc: 'Rich and bold, made from premium beans' },
            { name: 'Cappuccino', price: '$4.50', desc: 'Perfectly balanced with silky foam' },
            { name: 'Latte', price: '$4.75', desc: 'Smooth and creamy with art on top' },
          ].map(item => (
            <div key={item.name} className="p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-all">
              <h3 className="text-xl font-semibold mb-2">{item.name}</h3>
              <p className="text-amber-100 text-sm mb-4">{item.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{item.price}</span>
                <button className="px-4 py-2 rounded-full bg-amber-300 text-amber-900 font-medium text-sm hover:bg-amber-200 transition-colors">
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-12 text-center text-amber-200">
        <p>\\u2615 Brew & Bean \\u00B7 2024 \\u00B7 Made with love</p>
      </footer>
    </div>
  )
`

  return wrapFile('App.tsx', appContent)
}

function calculatorApp(): string {
  const appContent = `function App() {
  const [display, setDisplay] = useState('0')
  const [prev, setPrev] = useState(null)
  const [op, setOp] = useState(null)
  const [history, setHistory] = useState([])

  const inputNum = (n) => {
    if (display === '0' && n !== '.') {
      setDisplay(n)
    } else if (n === '.' && display.includes('.')) {
      return
    } else {
      setDisplay(display + n)
    }
  }

  const calculate = (a, b, op) => {
    switch(op) {
      case '+': return a + b
      case '-': return a - b
      case '\\u00D7': return a * b
      case '\\u00F7': return a / b
      default: return b
    }
  }

  const handleOp = (newOp) => {
    if (op && prev !== null) {
      const result = calculate(prev, parseFloat(display), op)
      setHistory([...history, prev + ' ' + op + ' ' + display + ' = ' + result])
      setDisplay(String(result))
      setPrev(result)
    } else {
      setPrev(parseFloat(display))
    }
    setOp(newOp)
    setDisplay('0')
  }

  const equals = () => {
    if (op && prev !== null) {
      const result = calculate(prev, parseFloat(display), op)
      setHistory([...history, prev + ' ' + op + ' ' + display + ' = ' + result])
      setDisplay(String(result))
      setPrev(null)
      setOp(null)
    }
  }

  const clear = () => {
    setDisplay('0')
    setPrev(null)
    setOp(null)
  }

  const buttons = [
    '7', '8', '9', '\\u00F7',
    '4', '5', '6', '\\u00D7',
    '1', '2', '3', '-',
    '0', '.', '=', '+',
  ]

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-xs">
        <div className="bg-gray-800 rounded-3xl p-6 shadow-2xl border border-gray-700">
          <div className="mb-4 h-20 flex items-end justify-end">
            <span className="text-4xl font-light text-white">{display}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <button onClick={clear} className="col-span-2 py-3 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-colors">Clear</button>
            {buttons.map(b => (
              <button
                key={b}
                onClick={() => b === '=' ? equals() : ['+', '-', '\\u00D7', '\\u00F7'].includes(b) ? handleOp(b) : inputNum(b)}
                className={b === '=' ? 'py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors' : ['+', '-', '\\u00D7', '\\u00F7'].includes(b) ? 'py-3 rounded-xl bg-gray-700 text-blue-400 font-medium hover:bg-gray-600 transition-colors' : 'py-3 rounded-xl bg-gray-700 text-white font-medium hover:bg-gray-600 transition-colors'}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
        {history.length > 0 && (
          <div className="mt-4 bg-gray-800/50 rounded-xl p-4 max-h-32 overflow-y-auto">
            <p className="text-xs text-gray-500 mb-2">History</p>
            {history.slice(-5).reverse().map((h, i) => (
              <p key={i} className="text-sm text-gray-400 font-mono">{h}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
`

  return wrapFile('App.tsx', appContent)
}

function genericApp(prompt: string): string {
  const appContent = `function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Your App is Ready</h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            Generated by AppForge AI based on your prompt. This is a demo template since the Groq API key isn't configured yet.
          </p>
        </div>

        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-500 mb-2">Your Request</h2>
          <p className="text-gray-300">${prompt.replace(/'/g, "\\'").replace(/"/g, '&quot;')}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {['Feature One', 'Feature Two', 'Feature Three'].map((f, i) => (
            <div key={i} className="p-5 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-blue-500/40 transition-all">
              <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center mb-3">
                <span className="text-blue-400 font-bold">{i + 1}</span>
              </div>
              <h3 className="font-semibold mb-1">{f}</h3>
              <p className="text-sm text-gray-400">Description of {f.toLowerCase()} goes here.</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            Demo Mode \\u2014 Configure GROQ_API_KEY for AI generation
          </div>
        </div>
      </div>
    </div>
  )
`

  return wrapFile('App.tsx', appContent)
}

export function generateDemoApp(prompt: string): string {
  const lower = prompt.toLowerCase()
  if (lower.includes('todo') || lower.includes('task')) return todoApp(prompt)
  if (lower.includes('coffee') || lower.includes('landing') || lower.includes('shop')) return landingApp(prompt)
  if (lower.includes('calculator') || lower.includes('calc')) return calculatorApp()
  return genericApp(prompt)
}

export function generateDemoRefinement(prompt: string, existingFiles: GeneratedFile[]): string {
  const base = existingFiles.find(f => f.path === 'App.tsx') || existingFiles[0]
  if (!base) return generateDemoApp(prompt)

  const refinedContent = base.content.replace(
    /(function App\(\)\s*\{)/,
    '$1\n  // Refined based on: ' + prompt.replace(/'/g, "\\'").replace(/"/g, '&quot;') + '\n'
  )

  return wrapFile('App.tsx', refinedContent)
}
