// @flow
import { getDroppableDimension, scrollDroppable } from '../../../../src/state/dimension';
import getArea from '../../../../src/state/get-area';
import { offset } from '../../../../src/state/spacing';
import type {
  Area,
  DroppableDimension,
  Position,
  Spacing,
} from '../../../../src/types';

const frameClient: Area = getArea({
  top: 10,
  left: 10,
  right: 90,
  bottom: 90,
});

const client: Area = getArea({
  top: 0,
  left: 0,
  right: 100,
  bottom: 100,
});

const frameScroll: Position = { x: 0, y: 0 };

const droppable: DroppableDimension = getDroppableDimension({
  descriptor: {
    id: 'drop-1',
    type: 'TYPE',
  },
  client,
  frameClient,
  frameScroll,
});

describe('is within visible bounds of droppable', () => {
  describe('without scroll update', () => {
    it('should return true if the position is within the clipped area', () => {
      expect(isVisibleThroughDroppableFrame(droppable)(frameClient)).toBe(true);
    });

    it('should return true if the spacing is partially visible', () => {
      const shifted: Spacing[] = [
        // on top
        offset(frameClient, { x: 0, y: -10 }),
        // on bottom
        offset(frameClient, { x: 0, y: 10 }),
        // on left
        offset(frameClient, { x: -10, y: 0 }),
        // on right
        offset(frameClient, { x: 10, y: 0 }),
      ];

      shifted.forEach((spacing: Spacing) => {
        expect(isVisibleThroughDroppableFrame(droppable)(spacing)).toBe(true);
      });
    });

    it('should return false if the position is not within the subject', () => {
      const spacing: Spacing = offset(client, { x: 1000, y: 1000 });
      expect(isVisibleThroughDroppableFrame(droppable)(spacing)).toBe(false);
    });

    it('should return false if the position is not within the clipped area', () => {
      // this point is not in the clipped area, but is within the client
      const outsideOfFrame: Spacing = {
        top: 91,
        left: 91,
        bottom: 95,
        right: 95,
      };
      expect(isVisibleThroughDroppableFrame(droppable)(outsideOfFrame)).toBe(false);
    });
  });

  describe('with scroll update', () => {
    describe('originally invisible', () => {
      it('should become visible when scrolling into view', () => {
        // this point is not in the clipped area, but is within the client
        const outsideOfFrame: Spacing = {
          top: 91,
          left: 91,
          bottom: 95,
          right: 95,
        };
        // asserting that it is out of the frame
        expect(isVisibleThroughDroppableFrame(droppable)(outsideOfFrame)).toBe(false);

        // scrolling down and to the right
        const newScroll: Position = { x: 10, y: 10 };
        const updated: DroppableDimension = scrollDroppable(droppable, newScroll);

        expect(isVisibleThroughDroppableFrame(updated)(outsideOfFrame)).toBe(true);
      });
    });

    describe('originally visible', () => {
      it('should become invisible when scrolling into view', () => {
        // right on the edge of being visible
        const insideFrame: Spacing = {
          top: 10,
          left: 10,
          bottom: 12,
          right: 12,
        };
        // originally visible
        expect(isVisibleThroughDroppableFrame(droppable)(insideFrame)).toBe(true);

        // scrolling down and to the right
        const newScroll: Position = { x: 5, y: 5 };
        const updated: DroppableDimension = scrollDroppable(droppable, newScroll);

        expect(isVisibleThroughDroppableFrame(updated)(insideFrame)).toBe(false);
      });
    });

    describe('never visible', () => {
      it('should remain invisible if not scrolled into view', () => {
        const outsideOfFrame: Spacing = {
          top: 92,
          left: 92,
          bottom: 95,
          right: 95,
        };
        expect(isVisibleThroughDroppableFrame(droppable)(outsideOfFrame)).toBe(false);

        // not scrolled far enough
        const newScroll: Position = { x: 1, y: 1 };
        const updated: DroppableDimension = scrollDroppable(droppable, newScroll);

        expect(isVisibleThroughDroppableFrame(updated)(outsideOfFrame)).toBe(false);
      });
    });

    describe('always visible', () => {
      it('should remain visible if not scrolled out of view', () => {
        // visible
        const spacing: Spacing = {
          top: 50, left: 50, right: 60, bottom: 60,
        };
        expect(isVisibleThroughDroppableFrame(droppable)(spacing)).toBe(true);

        // not scrolled far enough
        const newScroll: Position = { x: 1, y: 1 };
        const updated: DroppableDimension = scrollDroppable(droppable, newScroll);

        expect(isVisibleThroughDroppableFrame(updated)(spacing)).toBe(true);
      });
    });
  });
});
