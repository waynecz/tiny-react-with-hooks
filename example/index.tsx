import React, { useState, useEffect } from '../src'
import ReactDOM from '../src/vnode'

function App() {
  return (
    <main className="clazz1">
      <Number />
      <Number />
    </main>
  )
}

function Number() {
  const [number, setNumber] = useState(~~(Math.random() * 100))
  const [dep, setDep] = useState('initial dep')

  useEffect(() => {
    console.log('number effect:', number)
  }, [dep])

  useEffect(() => {
    console.log('dependencies effect:', dep)
  }, [number])

  return (
    <div className="number">
      <section >
        <button onClick={() => setNumber(number - 1)}>-</button>
        <input type="number" value={number} onInput={(e) => setNumber(e.target.value)} />
        <button onClick={() => setNumber(number + 1)}>+</button>
      </section>
      <p>{dep}</p>
      <button onClick={() => setDep(Math.random().toString(16))}>change dependencies</button>
    </div>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
