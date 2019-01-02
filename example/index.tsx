import Freact, { useState } from 'src'
import FreactDOM from 'src/vnode'
;(window as any).react = Freact

function plus(curValue, setValue) {
  setValue(!curValue)
}

function App({ data, children }: any) {
  const [value, setValue] = useState(true)

  return (
    <section id={data} className="clazz1">
      <h1>{value.toString()}</h1>
      {value ? <strong>yes</strong> : ''}
      <div className="wrap">
        <div className="button" onClick={_ => plus(value, setValue)}>
          toggle
        </div>
      </div>

      {children}
    </section>
  )
}

function Kid() {
  const [value, setValue] = useState(~~(Math.random() * 100))
  
  function handleClick() {
    setValue(~~(Math.random() * 100))
  }

  return <div onClick={handleClick} className="kid button">{value}</div>
}

FreactDOM.render(
  <App data={1}>
    <Kid />
  </App>,
  document.getElementById('friday')
)
