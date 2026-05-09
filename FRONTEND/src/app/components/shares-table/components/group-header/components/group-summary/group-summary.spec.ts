import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupSummary } from './group-summary';

describe('GroupSummary', () => {
  let component: GroupSummary;
  let fixture: ComponentFixture<GroupSummary>;

  beforeEach(async () => {
    TestBed.overrideComponent(GroupSummary, {
      set: {
        template: '<p>group-summary works!</p>',
        styles: [],
      },
    });

    await TestBed.configureTestingModule({
      imports: [GroupSummary],
    }).compileComponents();

    fixture = TestBed.createComponent(GroupSummary);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
