import debounce from './debounce'

type AnyFn = (...args: any[]) => any

interface ThrottleOptions {
  leading?: boolean
  trailing?: boolean
}

export default function throttle<T extends AnyFn>(
  func: T,
  wait = 0,
  options: ThrottleOptions = {},
) {
  const leading = options.leading ?? true
  const trailing = options.trailing ?? true

  return debounce(func, wait, {
    leading,
    trailing,
    maxWait: wait,
  })
}
