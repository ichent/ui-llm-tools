/**
 * MOCK примеров, пока нет доступа к исходникам UI-KIT.
 * get_examples отдаёт эту верстку, если FRONTDRIVE_STORYBOOK_ROOT не задан
 * (или файл не найден). Заменится реальными stories, как только появится путь.
 */
export const MOCK_EXAMPLE_PATH = '(mock)/ModalDF.stories.tsx';

export const MOCK_EXAMPLE_CODE = `// MOCK: заглушка вместо реальной story UI-KIT.
// Пока FRONTDRIVE_STORYBOOK_ROOT не задан, get_examples всегда возвращает этот пример.
import { useState } from 'react';
import { ModalDF } from '@ui-kit/modal';
import { Button } from '@ui-kit/button';
import { TextField } from '@ui-kit/text-field';

export const Example = () => {
  const [open, setOpen] = useState(true);

  return (
    <ModalDF
      open={open}
      onClose={() => setOpen(false)}
      title="Заголовок модалки"
      size="m"
      footer={
        <>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button variant="primary" onClick={() => setOpen(false)}>
            Сохранить
          </Button>
        </>
      }
    >
      <TextField label="Имя" placeholder="Введите имя" />
      <TextField label="Email" placeholder="you@example.com" />
    </ModalDF>
  );
};
`;
