function FieldError({ message, id }) {
  if (!message) {
    return null
  }

  return (
    <p id={id} className="field-error" role="alert">
      <span aria-hidden="true">⚠ </span>
      <span>Error: {message}</span>
    </p>
  )
}

export default FieldError
