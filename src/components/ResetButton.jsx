import { useState } from 'react'

function ResetButton({ disabled, onReset }) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="reset-confirm" role="group" aria-label="Confirm group reset">
        <span className="reset-prompt">Really reset?</span>
        <button
          type="button"
          className="btn-danger"
          onClick={() => {
            onReset()
            setConfirming(false)
          }}
        >
          Yes
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      className="btn-secondary"
      disabled={disabled}
      onClick={() => setConfirming(true)}
    >
      Reset group
    </button>
  )
}

export default ResetButton
