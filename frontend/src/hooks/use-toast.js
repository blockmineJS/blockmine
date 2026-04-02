import * as React from "react"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000
const DEFAULT_TOAST_DURATION = 4200

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST"
}

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString();
}

const toastTimeouts = new Map()
const autoDismissTimeouts = new Map()

const clearAutoDismissTimeout = (toastId) => {
  if (!autoDismissTimeouts.has(toastId)) {
    return
  }

  window.clearTimeout(autoDismissTimeouts.get(toastId))
  autoDismissTimeouts.delete(toastId)
}

const scheduleAutoDismiss = (toastId, duration = DEFAULT_TOAST_DURATION) => {
  clearAutoDismissTimeout(toastId)

  if (!Number.isFinite(duration) || duration <= 0) {
    return
  }

  const timeout = window.setTimeout(() => {
    autoDismissTimeouts.delete(toastId)
    dispatch({
      type: "DISMISS_TOAST",
      toastId,
    })
  }, duration)

  autoDismissTimeouts.set(toastId, timeout)
}

const addToRemoveQueue = (toastId) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state, action) => {
  switch (action.type) {
    case "ADD_TOAST":
      const existingToastIndex = state.toasts.findIndex((t) => t.id === action.toast.id)
      if (existingToastIndex !== -1) {
        const nextToasts = [...state.toasts]
        nextToasts.splice(existingToastIndex, 1)
        return {
          ...state,
          toasts: [action.toast, ...nextToasts].slice(0, TOAST_LIMIT),
        };
      }
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t),
      };

    case "DISMISS_TOAST": {
      const { toastId } = action

      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t),
      };
    }
    case "REMOVE_TOAST":
      if (action.toastId !== undefined) {
        clearAutoDismissTimeout(action.toastId)
      } else {
        state.toasts.forEach((toast) => clearAutoDismissTimeout(toast.id))
      }
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
}

const listeners = []

let memoryState = { toasts: [] }

function dispatch(action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

function toast({
  ...props
}) {
  const id = props.id ?? genId()
  const duration = typeof props.duration === "number" ? props.duration : DEFAULT_TOAST_DURATION
  const buildToastPayload = (nextProps = {}) => ({
    ...props,
    ...nextProps,
    id,
    duration: typeof nextProps.duration === "number" ? nextProps.duration : duration,
    open: true,
    onOpenChange: (open) => {
      if (!open) dismiss()
    },
  })

  const update = (nextProps) => {
    const nextDuration =
      typeof nextProps?.duration === "number"
        ? nextProps.duration
        : memoryState.toasts.find((toast) => toast.id === id)?.duration ?? duration

    dispatch({
      type: "UPDATE_TOAST",
      toast: buildToastPayload({ ...nextProps, duration: nextDuration }),
    })
    scheduleAutoDismiss(id, nextDuration)
  }

  const dismiss = () => {
    clearAutoDismissTimeout(id)
    dispatch({ type: "DISMISS_TOAST", toastId: id })
  }

  const payload = buildToastPayload()
  const hasExistingToast = memoryState.toasts.some((toast) => toast.id === id)

  dispatch({
    type: hasExistingToast ? "UPDATE_TOAST" : "ADD_TOAST",
    toast: payload,
  })
  scheduleAutoDismiss(id, payload.duration)

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    };
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

export { useToast, toast }
