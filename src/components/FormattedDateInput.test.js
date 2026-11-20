import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import FormattedDateInput from './FormattedDateInput';
import FormattedDateTimeInput from './FormattedDateTimeInput';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('lucide-react', () => ({
  Calendar: () => <span data-testid="icon-calendar" />,
  ChevronLeft: () => <span data-testid="icon-left" />,
  ChevronRight: () => <span data-testid="icon-right" />,
  Clock: () => <span data-testid="icon-clock" />,
}));

jest.mock('@headlessui/react', () => ({
  Portal: ({ children }) => <div data-testid="mock-portal">{children}</div>,
}));

jest.mock('react-datepicker', () => {
  return function MockDatePicker({ onChange }) {
    return (
      <div data-testid="mock-datepicker">
        <button
          type="button"
          data-testid="mock-dp-pick-early"
          onClick={() => onChange(new Date(2026, 10, 10))}
        >
          Pick Early
        </button>
        <button
          type="button"
          data-testid="mock-dp-pick-late"
          onClick={() => onChange(new Date(2026, 10, 25))}
        >
          Pick Late
        </button>
      </div>
    );
  };
});

function mountComponent(element) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const paint = root.render.bind(root);
  act(() => {
    paint(element);
  });
  return {
    container,
    rerender: (nextElement) => {
      act(() => {
        paint(nextElement);
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    },
  };
}

describe('FormattedDateInput', () => {
  let mounted = null;

  afterEach(() => {
    if (mounted) {
      mounted.unmount();
      mounted = null;
    }
  });

  test('does not emit onChange on unchanged blur (empty or populated)', () => {
    const onChange = jest.fn();
    mounted = mountComponent(
      <FormattedDateInput value="" onChange={onChange} />
    );
    const input = mounted.container.querySelector('input');

    act(() => {
      Simulate.focus(input);
      Simulate.blur(input);
    });
    expect(onChange).not.toHaveBeenCalled();

    mounted.rerender(<FormattedDateInput value="2026-11-16" onChange={onChange} />);
    expect(input.value).toBe('16-Nov-2026');

    act(() => {
      Simulate.focus(input);
      Simulate.blur(input);
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  test('does not emit onChange when readOnly or disabled on blur or Enter', () => {
    const onChange = jest.fn();
    mounted = mountComponent(
      <FormattedDateInput value="2026-11-16" onChange={onChange} readOnly />
    );
    const input = mounted.container.querySelector('input');

    act(() => {
      Simulate.focus(input);
      Simulate.change(input, { target: { value: '20-Nov-2026' } });
    });
    act(() => {
      Simulate.keyDown(input, { key: 'Enter' });
      Simulate.blur(input);
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('16-Nov-2026');

    mounted.rerender(
      <FormattedDateInput value="2026-11-16" onChange={onChange} disabled />
    );
    act(() => {
      Simulate.focus(input);
      Simulate.keyDown(input, { key: 'Enter' });
      Simulate.blur(input);
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  test('clamps edited date to min/max and emits ISO YYYY-MM-DD', () => {
    const onChange = jest.fn();
    mounted = mountComponent(
      <FormattedDateInput
        value="2026-11-16"
        min="2026-11-10"
        max="2026-11-20"
        onChange={onChange}
      />
    );
    const input = mounted.container.querySelector('input');

    act(() => {
      Simulate.focus(input);
      Simulate.change(input, { target: { value: '2026-11-01' } });
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].target.value).toBe('2026-11-10');

    mounted.rerender(
      <FormattedDateInput
        value="2026-11-10"
        min="2026-11-10"
        max="2026-11-20"
        onChange={onChange}
      />
    );
    act(() => {
      Simulate.blur(input);
    });
    expect(input.value).toBe('10-Nov-2026');
  });

  test('re-syncs local inputText if parent rejects change on blur, Enter, ArrowUp, or calendar click', () => {
    const rejectChange = jest.fn();
    mounted = mountComponent(
      <FormattedDateInput value="2026-11-16" onChange={rejectChange} />
    );
    const input = mounted.container.querySelector('input');

    // Blur after editing
    act(() => {
      Simulate.focus(input);
      Simulate.change(input, { target: { value: '20-Nov-2026' } });
    });
    expect(input.value).toBe('20-Nov-2026');
    act(() => {
      Simulate.blur(input);
    });
    expect(rejectChange).toHaveBeenCalled();
    expect(input.value).toBe('16-Nov-2026');

    // Enter after different value
    rejectChange.mockClear();
    act(() => {
      Simulate.focus(input);
      Simulate.change(input, { target: { value: '22-Nov-2026' } });
    });
    act(() => {
      Simulate.keyDown(input, { key: 'Enter' });
    });
    expect(rejectChange).toHaveBeenCalled();
    expect(input.value).toBe('16-Nov-2026');

    // ArrowUp while focused
    rejectChange.mockClear();
    act(() => {
      Simulate.focus(input);
      Simulate.keyDown(input, { key: 'ArrowUp' });
    });
    expect(rejectChange).toHaveBeenCalled();
    expect(input.value).toBe('16-Nov-2026');

    // Calendar pick while focused
    rejectChange.mockClear();
    const calBtn = mounted.container.querySelector('button[aria-label="Open calendar"]');
    act(() => {
      Simulate.focus(input);
      Simulate.click(calBtn);
    });
    const pickLateBtn = mounted.container.querySelector('[data-testid="mock-dp-pick-late"]');
    act(() => {
      Simulate.click(pickLateBtn);
    });
    expect(rejectChange).toHaveBeenCalled();
    expect(input.value).toBe('16-Nov-2026');
  });

  test('reverts invalid text on blur without emitting onChange', () => {
    const onChange = jest.fn();
    mounted = mountComponent(
      <FormattedDateInput value="2026-11-16" onChange={onChange} />
    );
    const input = mounted.container.querySelector('input');

    act(() => {
      Simulate.focus(input);
      Simulate.change(input, { target: { value: 'not-a-valid-date' } });
    });
    act(() => {
      Simulate.blur(input);
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('16-Nov-2026');
  });
});

describe('FormattedDateTimeInput', () => {
  let mounted = null;

  afterEach(() => {
    if (mounted) {
      mounted.unmount();
      mounted = null;
    }
  });

  test('does not fabricate a timestamp when tabbing through empty or unchanged populated inputs', () => {
    const onChange = jest.fn();
    mounted = mountComponent(
      <FormattedDateTimeInput value="" onChange={onChange} />
    );
    const dateInput = mounted.container.querySelector('input[type="text"]');
    const hourInput = mounted.container.querySelector('input[aria-label="Hour"]');
    const minInput = mounted.container.querySelector('input[aria-label="Minute"]');

    act(() => {
      Simulate.focus(dateInput);
      Simulate.blur(dateInput);
      Simulate.focus(hourInput);
      Simulate.blur(hourInput);
      Simulate.focus(minInput);
      Simulate.blur(minInput);
    });
    expect(onChange).not.toHaveBeenCalled();

    mounted.rerender(
      <FormattedDateTimeInput value="2026-11-20T15:30" onChange={onChange} />
    );
    act(() => {
      Simulate.focus(hourInput);
      Simulate.blur(hourInput);
      Simulate.focus(minInput);
      Simulate.blur(minInput);
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  test('enforces full YYYY-MM-DDTHH:mm min/max bounds on date change, typed time, and arrow step', () => {
    const onChange = jest.fn();
    mounted = mountComponent(
      <FormattedDateTimeInput
        value=""
        min="2026-11-20T14:30"
        max="2026-11-20T16:15"
        onChange={onChange}
      />
    );
    const dateInput = mounted.container.querySelector('input[type="text"]');

    // Selecting 2026-11-20 from empty starts with default 10:00 AM -> clamped up to 14:30
    act(() => {
      Simulate.focus(dateInput);
      Simulate.change(dateInput, { target: { value: '2026-11-20' } });
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ target: expect.objectContaining({ value: '2026-11-20T14:30' }) })
    );

    // Rerender with min boundary; typing 01 PM (13:00 < 14:30) clamps to 14:30
    onChange.mockClear();
    mounted.rerender(
      <FormattedDateTimeInput
        value="2026-11-20T15:00"
        min="2026-11-20T14:30"
        max="2026-11-20T16:15"
        onChange={onChange}
      />
    );
    const hourInput = mounted.container.querySelector('input[aria-label="Hour"]');
    act(() => {
      Simulate.focus(hourInput);
      Simulate.change(hourInput, { target: { value: '1' } });
    });
    act(() => {
      Simulate.keyDown(hourInput, { key: 'Enter' });
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ target: expect.objectContaining({ value: '2026-11-20T14:30' }) })
    );

    // Rerender at max boundary; ArrowUp hour tries 17:15 > 16:15 -> stays 16:15 cleanly
    onChange.mockClear();
    mounted.rerender(
      <FormattedDateTimeInput
        value="2026-11-20T16:15"
        min="2026-11-20T14:30"
        max="2026-11-20T16:15"
        onChange={onChange}
      />
    );
    act(() => {
      Simulate.focus(hourInput);
      Simulate.keyDown(hourInput, { key: 'ArrowUp' });
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(hourInput.value).toBe('04');
  });

  test('commits single-digit hour "1" and minute "5" synchronously on Enter', () => {
    const onChange = jest.fn();
    mounted = mountComponent(
      <FormattedDateTimeInput value="2026-11-20T09:00" onChange={onChange} />
    );
    const hourInput = mounted.container.querySelector('input[aria-label="Hour"]');
    const minInput = mounted.container.querySelector('input[aria-label="Minute"]');

    act(() => {
      Simulate.focus(hourInput);
      Simulate.change(hourInput, { target: { value: '1' } });
    });
    act(() => {
      Simulate.keyDown(hourInput, { key: 'Enter' });
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ target: expect.objectContaining({ value: '2026-11-20T01:00' }) })
    );

    onChange.mockClear();
    mounted.rerender(
      <FormattedDateTimeInput value="2026-11-20T01:00" onChange={onChange} />
    );
    act(() => {
      Simulate.focus(minInput);
      Simulate.change(minInput, { target: { value: '5' } });
    });
    act(() => {
      Simulate.keyDown(minInput, { key: 'Enter' });
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ target: expect.objectContaining({ value: '2026-11-20T01:05' }) })
    );
  });

  test('re-syncs hour and minute inputs back if parent rejects emitted value', () => {
    const rejectChange = jest.fn();
    mounted = mountComponent(
      <FormattedDateTimeInput value="2026-11-20T15:30" onChange={rejectChange} />
    );
    const hourInput = mounted.container.querySelector('input[aria-label="Hour"]');

    act(() => {
      Simulate.focus(hourInput);
      Simulate.keyDown(hourInput, { key: 'ArrowUp' });
    });
    expect(rejectChange).toHaveBeenCalled();
    expect(hourInput.value).toBe('03');
  });
});
