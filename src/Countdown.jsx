import React from 'react';
import PropTypes from 'prop-types';

/**
 * Pads a given string or number with zeros.
 *
 * @param {any} value Value to zero-pad.
 * @param {number} [length=2] Amount of characters to pad.
 * @returns Left-padded number/string.
 */
export const zeroPad = (value, length = 2) => {
  if (length === 0) return value;
  const strValue = String(value);
  return strValue.length >= length ? strValue : ('0'.repeat(length) + strValue).slice(length * -1);
};

/**
 * Finds and returns the next valid value within the date array given.
 *
 * @param {array} array of valid acceptable values for the date prop passed into the react countdown component
 */
export const availableMultiDate = date => {
  if (!Array.isArray(date)) {
    return false;
  }

  return date.find(dateIter => {
    if (typeof dateIter !== 'number' && typeof dateIter !== 'string') {
      return false;
    }
    return typeof dateIter === 'number'
      ? dateIter >= Date.now()
      : new Date(dateIter).getTime() >= Date.now();
  });
};

/**
 * Calculates the time difference between a given end date and the current date.
 *
 * @param {Date|string|number} date Date or timestamp representation of the end date.
 * @param {Object} [{ now = Date.now, precision = 0, controlled = false }={}]
 *  {function} [date=Date.now] Alternative function for returning the current date.
 *  {number} [precision=0] The precision on a millisecond basis.
 *  {boolean} [controlled=false] Defines whether the calculated value is already provided as the time difference or not.
 * @param {number} [precision=0] The precision on a millisecond basis.
 * @param {boolean} [controlled=false] Defines whether the calculated value is already provided as the time difference or not.
 * @returns Object that includes details about the time difference.
 */
export const getTimeDifference = (
  date,
  { now = Date.now, precision = 0, controlled = false } = {}
) => {
  const multiDates = Array.isArray(date);
  let dateIter;
  if (multiDates) {
    dateIter = availableMultiDate(date) ? availableMultiDate(date) : date[date.length - 1];
  } else {
    dateIter = date;
  }
  const startDate = typeof dateIter === 'string' ? new Date(dateIter) : dateIter;
  const total = parseInt(
    (Math.max(0, controlled ? startDate : startDate - now()) / 1000).toFixed(
      Math.max(0, Math.min(20, precision))
    ) * 1000,
    10
  );

  const seconds = total / 1000;

  return {
    total,
    days: Math.floor(seconds / (3600 * 24)),
    hours: Math.floor((seconds / 3600) % 24),
    minutes: Math.floor((seconds / 60) % 60),
    seconds: Math.floor(seconds % 60),
    milliseconds: Number(((seconds % 1) * 1000).toFixed()),
    completed: total <= 0,
    multiDates,
  };
};

/**
 * A customizable countdown component for React.
 *
 * @export
 * @class Countdown
 * @extends {React.Component}
 */
export default class Countdown extends React.Component {
  constructor(props) {
    super(props);
    const { date, now, precision, controlled } = this.props;
    this.mounted = false;
    this.state = {
      ...getTimeDifference(date, {
        now,
        precision,
        controlled,
      }),
    };
  }

  componentDidMount() {
    this.mounted = true;

    if (!this.props.controlled) {
      this.interval = setInterval(this.tick, this.props.intervalDelay);
    }
  }

  componentWillReceiveProps(nextProps) {
    const { date, now, precision, controlled } = nextProps;
    this.setDeltaState(
      getTimeDifference(date, {
        now,
        precision,
        controlled,
      })
    );
  }

  componentWillUnmount() {
    this.mounted = false;
    this.clearInterval();
  }

  setDeltaState(delta) {
    if (!this.state.completed && delta.completed) {
      this.clearInterval();

      if (this.props.onComplete) {
        this.props.onComplete(delta);
      }
    }

    if (delta.multiDates && delta.total > this.state.total) {
      if (this.props.onMultiSwitch) {
        this.props.onMultiSwitch(delta);
      }
    }

    if (this.mounted) {
      this.setState({ ...delta });
    }
  }

  getFormattedDelta() {
    let { days, hours } = this.state;
    const { minutes, seconds } = this.state;
    const { daysInHours, zeroPadLength } = this.props;

    if (daysInHours) {
      hours = zeroPad(hours + days * 24, zeroPadLength);
      days = null;
    } else {
      hours = zeroPad(hours, Math.min(2, zeroPadLength));
    }

    return {
      days,
      hours,
      minutes: zeroPad(minutes, Math.min(2, zeroPadLength)),
      seconds: zeroPad(seconds, Math.min(2, zeroPadLength)),
    };
  }

  clearInterval() {
    clearInterval(this.interval);
    delete this.interval;
  }

  tick = () => {
    const { date, now, precision, controlled, onTick } = this.props;
    const delta = getTimeDifference(date, {
      now,
      precision,
      controlled,
    });

    this.setDeltaState({
      ...delta,
    });

    if (onTick && delta.total > 0) {
      onTick(delta);
    }
  };

  render() {
    const formattedDelta = this.getFormattedDelta();

    if (this.props.renderer) {
      return this.props.renderer({ ...this.props, ...this.state, ...formattedDelta });
    }

    if (this.state.completed && this.props.children) {
      const computedProps = { ...this.props, ...this.state, ...formattedDelta };
      delete computedProps.children;
      return React.cloneElement(this.props.children, {
        countdown: computedProps,
      });
    } else {
      const { days, hours, minutes, seconds } = formattedDelta;
      return (
        <span>
          {days}
          {days != null ? ':' : ''}
          {hours}:{minutes}:{seconds}
        </span>
      );
    }
  }
}

Countdown.propTypes = {
  date: PropTypes.oneOfType([
    PropTypes.instanceOf(Date),
    PropTypes.string,
    PropTypes.number,
    PropTypes.array,
  ]).isRequired, // eslint-disable-line react/no-unused-prop-types
  daysInHours: PropTypes.bool,
  zeroPadLength: PropTypes.number,
  controlled: PropTypes.bool,
  intervalDelay: PropTypes.number,
  precision: PropTypes.number,
  children: PropTypes.any, // eslint-disable-line react/forbid-prop-types
  renderer: PropTypes.func,
  now: PropTypes.func, // eslint-disable-line react/no-unused-prop-types
  onTick: PropTypes.func,
  onComplete: PropTypes.func,
  onMultiSwitch: PropTypes.func,
};

Countdown.defaultProps = {
  daysInHours: false,
  zeroPadLength: 2,
  controlled: false,
  intervalDelay: 1000,
  precision: 0,
  children: null,
};
