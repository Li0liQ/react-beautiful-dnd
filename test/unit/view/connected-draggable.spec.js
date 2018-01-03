// @flow
import { makeSelector } from '../../../src/view/draggable/connected-draggable';
import { getPreset } from '../../utils/dimension';
import { negate } from '../../../src/state/position';
import * as state from '../../utils/simple-state-preset';
import type {
  Selector,
  OwnProps,
  MapProps,
} from '../../../src/view/draggable/draggable-types';
import type {
  Position,
  State,
  CurrentDragPositions,
  DragImpact,
  DraggableDimension,
} from '../../../src/types';

const preset = getPreset();
const move = (previous: State, offset: Position): State => {
  const clientPositions: CurrentDragPositions = {
    offset,
    // not calculating for this test
    selection: { x: 0, y: 0 },
    center: { x: 0, y: 0 },
  };

  return {
    ...previous,
    drag: {
      ...previous.drag,
      current: {
        ...previous.drag.current,
        client: clientPositions,
        page: clientPositions,
      },
    },
  };
};

const getOwnProps = (dimension: DraggableDimension): OwnProps => ({
  draggableId: dimension.descriptor.id,
  index: dimension.descriptor.index,
  isDragDisabled: false,
  disableInteractiveElementBlocking: false,
  children: () => null,
});

describe('Connected Draggable', () => {
  describe('is currently dragging', () => {
    const ownProps: OwnProps = getOwnProps(preset.inHome1);

    it('should log an error when there is invalid drag state', () => {

    });

    it('should move the dragging item to the current offset', () => {
      const selector: Selector = makeSelector();

      const result: MapProps = selector(
        move(state.dragging(), { x: 20, y: 30 }),
        ownProps
      );

      expect(result).toEqual({
        isDropAnimating: false,
        isDragging: true,
        offset: { x: 20, y: 30 },
        shouldAnimateDragMovement: false,
        shouldAnimateDisplacement: false,
        dimension: preset.inHome1,
        direction: null,
      });
    });

    it('should control whether drag movement is allowed based the current state', () => {
      const selector: Selector = makeSelector();
      const previous: State = move(state.dragging(), { x: 20, y: 30 });

      // drag animation is allowed
      const allowed: State = {
        ...previous,
        drag: {
          ...previous.drag,
          current: {
            ...previous.drag.current,
            shouldAnimate: true,
          },
        },
      };
      expect(selector(allowed, ownProps).shouldAnimateDragMovement).toBe(true);

      // drag animation is not allowed
      const notAllowed: State = {
        ...previous,
        drag: {
          ...previous.drag,
          current: {
            // $ExpectError - not checking for null
            ...previous.drag.current,
            shouldAnimate: false,
          },
        },
      };
      expect(selector(notAllowed, ownProps).shouldAnimateDragMovement).toBe(false);
    });

    it('should not break memoization on multiple calls to the same offset', () => {
      const selector: Selector = makeSelector();

      const result1: MapProps = selector(
        move(state.dragging(), { x: 100, y: 200 }),
        ownProps
      );
      const result2: MapProps = selector(
        move(state.dragging(), { x: 100, y: 200 }),
        ownProps
      );

      expect(result1).toBe(result2);
      expect(selector.recomputations()).toBe(1);
    });

    it('should break memoization on multiple calls if moving to a new position', () => {
      const selector: Selector = makeSelector();

      const result1: MapProps = selector(
        move(state.dragging(), { x: 100, y: 200 }),
        ownProps
      );
      const result2: MapProps = selector(
        move({ ...state.dragging() }, { x: 101, y: 200 }),
        ownProps
      );

      expect(result1).not.toBe(result2);
      expect(result1).not.toEqual(result2);
      expect(selector.recomputations()).toBe(2);
    });

    describe('drop animating', () => {
      it('should move the draggable to the new offset', () => {
        const selector: Selector = makeSelector();
        const current: State = state.dropAnimating();

        const result: MapProps = selector(
          current,
          ownProps,
        );

        expect(result).toEqual({
          // no longer dragging
          isDragging: false,
          // is now drop animating
          isDropAnimating: true,
          // $ExpectError - not testing for null
          offset: current.drop.pending.newHomeOffset,
          dimension: preset.inHome1,
          direction: null,
          // animation now controlled by isDropAnimating flag
          shouldAnimateDisplacement: false,
          shouldAnimateDragMovement: false,
        });
      });
    });

    describe('user cancel', () => {
      it('should move the draggable to the new offset', () => {
        const selector: Selector = makeSelector();
        const current: State = state.userCancel();

        const result: MapProps = selector(
          current,
          ownProps,
        );

        expect(result).toEqual({
          // no longer dragging
          isDragging: false,
          // is now drop animating
          isDropAnimating: true,
          // $ExpectError - not testing for null
          offset: current.drop.pending.newHomeOffset,
          dimension: preset.inHome1,
          direction: null,
          // animation now controlled by isDropAnimating flag
          shouldAnimateDisplacement: false,
          shouldAnimateDragMovement: false,
        });
      });
    });
  });

  describe('something else is dragging', () => {
    describe('nothing impacted by drag', () => {
      const ownProps: OwnProps = getOwnProps(preset.inHome2);

      it('should return the default map props', () => {
        const selector: Selector = makeSelector();
        const defaultMapProps: MapProps = selector(state.idle, ownProps);

        const result: MapProps = selector(
          state.dragging(preset.inHome1.descriptor.id),
          ownProps
        );

        expect(result).toBe(defaultMapProps);
      });

      it('should not break memoization on multiple calls', () => {
        const selector: Selector = makeSelector();
        const defaultMapProps: MapProps = selector(state.idle, ownProps);

        const result1: MapProps = selector(
          move(state.dragging(preset.inHome1.descriptor.id), { x: 10, y: 40 }),
          ownProps
        );
        const result2: MapProps = selector(
          move(state.dragging(preset.inHome1.descriptor.id), { x: 15, y: 60 }),
          ownProps
        );

        expect(result1).toBe(defaultMapProps);
        expect(result1).toBe(result2);
        expect(selector.recomputations()).toBe(1);
      });
    });

    describe('other draggables impacted - but not this one', () => {
      it('should return the default props', () => {
        // looking at inHome3
        const ownProps: OwnProps = getOwnProps(preset.inHome3);
        const selector = makeSelector();
        const defaultMapProps: MapProps = selector(state.idle, ownProps);
        // moving inHome1 down beyond inHome2
        const impact: DragImpact = {
          direction: preset.home.axis.direction,
          destination: {
            index: 1,
            droppableId: preset.home.descriptor.id,
          },
          movement: {
            amount: { y: preset.inHome1.client.withMargin.height, x: 0 },
            isBeyondStartPosition: true,
            displaced: [
              {
                draggableId: preset.inHome2.descriptor.id,
                isVisible: true,
                shouldAnimate: true,
              },
            ],
          },
        };
        const previous: State = state.dragging(preset.inHome1.descriptor.id);
        const current: State = {
          ...previous,
          drag: {
            ...previous.drag,
            impact,
          },
        };

        const result: MapProps = selector(current, ownProps);

        expect(result).toEqual(defaultMapProps);
      });

      it('should not break memoization if not needing to move - even if other things draggables are', () => {
        // looking at inHome4
        const ownProps: OwnProps = {
          draggableId: preset.inHome4.descriptor.id,
          index: preset.inHome4.descriptor.index,
          isDragDisabled: false,
          disableInteractiveElementBlocking: false,
          children: () => null,
        };

        const selector = makeSelector();
        const defaultMapProps: MapProps = selector(state.idle, ownProps);
        // moving inHome1 down beyond inHome2
        const impact1: DragImpact = {
          direction: preset.home.axis.direction,
          destination: {
            index: 1,
            droppableId: preset.home.descriptor.id,
          },
          movement: {
            amount: { y: preset.inHome1.client.withMargin.height, x: 0 },
            isBeyondStartPosition: true,
            displaced: [
              {
                draggableId: preset.inHome2.descriptor.id,
                isVisible: true,
                shouldAnimate: true,
              },
            ],
          },
        };
        // moving inHome1 down beyond inHome3
        const impact2: DragImpact = {
          direction: preset.home.axis.direction,
          destination: {
            index: 2,
            droppableId: preset.home.descriptor.id,
          },
          movement: {
            amount: { y: preset.inHome1.client.withMargin.height, x: 0 },
            isBeyondStartPosition: true,
            displaced: [
              {
                draggableId: preset.inHome2.descriptor.id,
                isVisible: true,
                shouldAnimate: true,
              },
              {
                draggableId: preset.inHome3.descriptor.id,
                isVisible: true,
                shouldAnimate: true,
              },
            ],
          },
        };
        const original: State = state.dragging(preset.inHome1.descriptor.id);
        const first: State = {
          ...original,
          drag: {
            ...original.drag,
            impact: impact1,
          },
        };
        const second: State = {
          ...first,
          drag: {
            ...first.drag,
            impact: impact2,
          },
        };

        const result1: MapProps = selector(first, ownProps);
        const result2: MapProps = selector(second, ownProps);

        expect(result1).toEqual(defaultMapProps);
        expect(result1).toBe(result2);
      });
    });

    describe('impacted by the drag', () => {
      it('should move in backwards if the dragging item is moving beyond its start position', () => {
        // looking at inHome2
        const ownProps: OwnProps = getOwnProps(preset.inHome2);
        const selector = makeSelector();
        const amount: Position = { y: preset.inHome1.client.withMargin.height, x: 0 };
        // moving inHome1 down beyond inHome2
        const impact: DragImpact = {
          direction: preset.home.axis.direction,
          destination: {
            index: 1,
            droppableId: preset.home.descriptor.id,
          },
          movement: {
            amount,
            isBeyondStartPosition: true,
            displaced: [
              {
                draggableId: preset.inHome2.descriptor.id,
                isVisible: true,
                shouldAnimate: true,
              },
            ],
          },
        };
        const previous: State = state.dragging(preset.inHome1.descriptor.id);
        const current: State = {
          ...previous,
          drag: {
            ...previous.drag,
            impact,
          },
        };

        const result: MapProps = selector(current, ownProps);

        expect(result).toEqual({
          isDragging: false,
          isDropAnimating: false,
          // moving backwards
          offset: negate(amount),
          shouldAnimateDisplacement: true,
          shouldAnimateDragMovement: false,
          dimension: null,
          direction: null,
        });
      });

      it('should move forwards if the dragging item is not beyond its start position', () => {
        // looking at inHome1
        const ownProps: OwnProps = getOwnProps(preset.inHome1);
        const selector = makeSelector();
        const amount: Position = { y: preset.inHome2.client.withMargin.height, x: 0 };
        // moving inHome2 up beyond inHome1
        const impact: DragImpact = {
          direction: preset.home.axis.direction,
          destination: {
            index: 0,
            droppableId: preset.home.descriptor.id,
          },
          movement: {
            amount,
            isBeyondStartPosition: false,
            displaced: [
              {
                draggableId: preset.inHome1.descriptor.id,
                isVisible: true,
                shouldAnimate: true,
              },
            ],
          },
        };
        const previous: State = state.dragging(preset.inHome2.descriptor.id);
        const current: State = {
          ...previous,
          drag: {
            ...previous.drag,
            impact,
          },
        };

        const result: MapProps = selector(current, ownProps);

        expect(result).toEqual({
          isDragging: false,
          isDropAnimating: false,
          // moving forwards
          offset: amount,
          shouldAnimateDisplacement: true,
          shouldAnimateDragMovement: false,
          dimension: null,
          direction: null,
        });
      });

      it('should not move the item and return the default map props if the displacement is not visible', () => {
        // looking at inHome2
        const ownProps: OwnProps = getOwnProps(preset.inHome2);
        const selector = makeSelector();
        const defaultMapProps: MapProps = selector(state.idle, ownProps);
        const amount: Position = { y: preset.inHome1.client.withMargin.height, x: 0 };
        // moving inHome1 down beyond inHome2
        const impact: DragImpact = {
          direction: preset.home.axis.direction,
          destination: {
            index: 1,
            droppableId: preset.home.descriptor.id,
          },
          movement: {
            amount,
            isBeyondStartPosition: true,
            displaced: [
              {
                draggableId: preset.inHome2.descriptor.id,
                isVisible: false,
                shouldAnimate: true,
              },
            ],
          },
        };
        const previous: State = state.dragging(preset.inHome1.descriptor.id);
        const current: State = {
          ...previous,
          drag: {
            ...previous.drag,
            impact,
          },
        };

        const result: MapProps = selector(current, ownProps);

        expect(result).toBe(defaultMapProps);
      });

      it('should indicate whether the displacement should be animated based on the drag impact', () => {
        // looking at inHome2
        const ownProps: OwnProps = getOwnProps(preset.inHome2);
        const selector = makeSelector();
        const amount: Position = { y: preset.inHome1.client.withMargin.height, x: 0 };
        // moving inHome1 down beyond inHome2
        const impact: DragImpact = {
          direction: preset.home.axis.direction,
          destination: {
            index: 1,
            droppableId: preset.home.descriptor.id,
          },
          movement: {
            amount,
            isBeyondStartPosition: true,
            displaced: [
              {
                draggableId: preset.inHome2.descriptor.id,
                isVisible: true,
                shouldAnimate: false,
              },
            ],
          },
        };
        const previous: State = state.dragging(preset.inHome1.descriptor.id);
        const current: State = {
          ...previous,
          drag: {
            ...previous.drag,
            impact,
          },
        };

        const result: MapProps = selector(current, ownProps);

        expect(result).toEqual({
          isDragging: false,
          isDropAnimating: false,
          // moving backwards
          offset: negate(amount),
          shouldAnimateDisplacement: false,
          shouldAnimateDragMovement: false,
          dimension: null,
          direction: null,
        });
      });

      it('should not break memoization on multiple calls if displaced and remain displaced', () => {
        // looking at inHome4
        const ownProps: OwnProps = getOwnProps(preset.inHome2);
        const selector = makeSelector();
        const amount: Position = { y: preset.inHome1.client.withMargin.height, x: 0 };
        // moving inHome1 down beyond inHome2
        const impact1: DragImpact = {
          direction: preset.home.axis.direction,
          destination: {
            index: 1,
            droppableId: preset.home.descriptor.id,
          },
          movement: {
            amount,
            isBeyondStartPosition: true,
            displaced: [
              {
                draggableId: preset.inHome2.descriptor.id,
                isVisible: true,
                shouldAnimate: true,
              },
            ],
          },
        };
        // moving inHome1 down beyond inHome3
        // inHome2 is still displaced
        const impact2: DragImpact = {
          direction: preset.home.axis.direction,
          destination: {
            index: 2,
            droppableId: preset.home.descriptor.id,
          },
          movement: {
            amount,
            isBeyondStartPosition: true,
            displaced: [
              {
                draggableId: preset.inHome2.descriptor.id,
                isVisible: true,
                shouldAnimate: true,
              },
              {
                draggableId: preset.inHome3.descriptor.id,
                isVisible: true,
                shouldAnimate: true,
              },
            ],
          },
        };
        const original: State = state.dragging(preset.inHome1.descriptor.id);
        const first: State = {
          ...original,
          drag: {
            ...original.drag,
            impact: impact1,
          },
        };
        const second: State = {
          ...first,
          drag: {
            ...first.drag,
            impact: impact2,
          },
        };

        const result1: MapProps = selector(first, ownProps);
        const result2: MapProps = selector(second, ownProps);

        // checking memoization
        expect(result1).toBe(result2);
        // validating result
        expect(result1).toEqual({
          isDragging: false,
          isDropAnimating: false,
          // moving backwards
          offset: negate(amount),
          shouldAnimateDisplacement: true,
          shouldAnimateDragMovement: false,
          dimension: null,
          direction: null,
        });
      });

      describe('drop animating', () => {
        it('should not break memoization from the dragging phase', () => {
          // looking at inHome2
          const ownProps: OwnProps = getOwnProps(preset.inHome2);
          const selector = makeSelector();
          const amount: Position = { y: preset.inHome1.client.withMargin.height, x: 0 };
          // moving inHome1 down beyond inHome2
          const impact: DragImpact = {
            direction: preset.home.axis.direction,
            destination: {
              index: 1,
              droppableId: preset.home.descriptor.id,
            },
            movement: {
              amount,
              isBeyondStartPosition: true,
              displaced: [
                {
                  draggableId: preset.inHome2.descriptor.id,
                  isVisible: true,
                  shouldAnimate: true,
                },
              ],
            },
          };
          const dragging: State = (() => {
            const previous: State = state.dragging(preset.inHome1.descriptor.id);
            return {
              ...previous,
              drag: {
                ...previous.drag,
                impact,
              },
            };
          })();
          const dropping: State = (() => {
            const previous: State = state.dropAnimating(preset.inHome1.descriptor.id);
            return {
              ...previous,
              drop: {
                ...previous.drop,
                pending: {
                  // $ExpectError - not checking for null
                  ...previous.drop.pending,
                  impact,
                },
              },
            };
          })();

          const duringDrag: MapProps = selector(dragging, ownProps);
          const duringDrop: MapProps = selector(dropping, ownProps);

          // memoization check
          expect(duringDrag).toBe(duringDrop);
          expect(selector.recomputations()).toBe(1);
          // validating result
          expect(duringDrop).toEqual({
            isDragging: false,
            isDropAnimating: false,
            // moving backwards
            offset: negate(amount),
            shouldAnimateDisplacement: true,
            shouldAnimateDragMovement: false,
            dimension: null,
            direction: null,
          });
        });
      });

      describe('user cancel', () => {
        // looking at inHome2
        const ownProps: OwnProps = getOwnProps(preset.inHome2);
        const selector = makeSelector();
        const amount: Position = { y: preset.inHome1.client.withMargin.height, x: 0 };
        // moving inHome1 down beyond inHome2
        const impact: DragImpact = {
          direction: preset.home.axis.direction,
          destination: {
            index: 1,
            droppableId: preset.home.descriptor.id,
          },
          movement: {
            amount,
            isBeyondStartPosition: true,
            displaced: [
              {
                draggableId: preset.inHome2.descriptor.id,
                isVisible: true,
                shouldAnimate: true,
              },
            ],
          },
        };
        const dragging: State = (() => {
          const previous: State = state.dragging(preset.inHome1.descriptor.id);
          return {
            ...previous,
            drag: {
              ...previous.drag,
              impact,
            },
          };
        })();
        const dropping: State = (() => {
          const previous: State = state.userCancel(preset.inHome1.descriptor.id);
          return {
            ...previous,
            drop: {
              ...previous.drop,
              pending: {
                // $ExpectError - not checking for null
                ...previous.drop.pending,
                impact,
              },
            },
          };
        })();

        const duringDrag: MapProps = selector(dragging, ownProps);
        const duringDrop: MapProps = selector(dropping, ownProps);

        // memoization check
        expect(duringDrag).toBe(duringDrop);
        expect(selector.recomputations()).toBe(1);
        // validating result
        expect(duringDrop).toEqual({
          isDragging: false,
          isDropAnimating: false,
          // moving backwards
          offset: negate(amount),
          shouldAnimateDisplacement: true,
          shouldAnimateDragMovement: false,
          dimension: null,
          direction: null,
        });
      });
    });
  });

  describe('nothing is dragging', () => {
    it('should return the default map props', () => {

    });

    it('should not break memoization on multiple calls', () => {

    });
  });
});
