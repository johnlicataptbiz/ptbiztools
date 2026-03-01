type AnyFn = (...args: any[]) => any

interface DebounceOptions {
  leading?: boolean
  trailing?: boolean
  maxWait?: number
}

type DebouncedFn<T extends AnyFn> = ((...args: Parameters<T>) => ReturnType<T> | undefined) & {
  cancel: () => void
  flush: () => ReturnType<T> | undefined
  schedule: () => void
}

export default function debounce<T extends AnyFn>(
  func: T,
  wait = 0,
  options: DebounceOptions = {},
): DebouncedFn<T> {
  const leading = options.leading ?? false
  const trailing = options.trailing ?? true
  const maxWait = options.maxWait

  let timer: ReturnType<typeof setTimeout> | null = null
  let lastInvokeTime = 0
  let lastCallTime = 0
  let lastArgs: Parameters<T> | null = null
  let lastThis: unknown
  let result: ReturnType<T> | undefined

  const invoke = (time: number) => {
    lastInvokeTime = time
    const args = lastArgs
    const thisArg = lastThis
    lastArgs = null
    lastThis = undefined
    if (args) {
      result = func.apply(thisArg, args)
    }
    return result
  }

  const startTimer = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(timerExpired, wait)
  }

  const shouldInvoke = (time: number) => {
    if (!lastCallTime) return true
    const timeSinceLastCall = time - lastCallTime
    const timeSinceLastInvoke = time - lastInvokeTime
    if (maxWait == null) return timeSinceLastCall >= wait
    return timeSinceLastCall >= wait || timeSinceLastInvoke >= maxWait
  }

  const timerExpired = () => {
    timer = null
    const time = Date.now()
    if (trailing && lastArgs) {
      invoke(time)
    }
  }

  const debounced = function (this: unknown, ...args: Parameters<T>) {
    const time = Date.now()
    const isInvoking = shouldInvoke(time)

    lastArgs = args
    lastThis = this
    lastCallTime = time

    if (!timer) {
      startTimer()
      if (leading && isInvoking) {
        return invoke(time)
      }
      return result
    }

    if (maxWait != null && isInvoking) {
      startTimer()
      return invoke(time)
    }

    return result
  } as DebouncedFn<T>

  debounced.cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
    lastArgs = null
    lastThis = undefined
    lastCallTime = 0
  }

  debounced.flush = () => {
    if (!timer) return result
    clearTimeout(timer)
    timer = null
    if (lastArgs) {
      return invoke(Date.now())
    }
    return result
  }

  debounced.schedule = () => {
    if (!timer) startTimer()
  }

  return debounced
}
