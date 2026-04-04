import { Component, input, output } from '@angular/core';
import { TButtonVariant } from 'app/types/button-variants';

@Component({
  selector: 'app-btn',
  imports: [],
  templateUrl: './button.html',
  styleUrls: ['./button.scss'],
})
export class Button {
  disabled = input<boolean>(false);
  variant = input<TButtonVariant>('primary');
  onClick = output<void>();
}
