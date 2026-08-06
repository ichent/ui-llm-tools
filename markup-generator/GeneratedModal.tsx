import React from 'react';
import { ModalDF, TextField } from '@ui-kit/df';
import { Button, Checkbox, Combobox, DatePicker, Divider, Flow, IconButton } from '@ui-kit/plasma';

export const GeneratedModal = () => {
  return (
    <ModalDF
      header={(
          <>
            {/* Modal header */}
            <Flow direction="row">
              <Button />
              <Flow direction="column" gap={2}>
                <Flow direction="row" gap={12}>
                  {"Создание комплекта документов № 24233423"}
                  <Flow direction="row" gap={10}>
                    <Flow direction="row" gap={10}>
                      <Flow direction="row" gap={3}>
                        {"Бейдж"}
                      </Flow>
                    </Flow>
                  </Flow>
                </Flow>
                {"Платёжные данные"}
              </Flow>
            </Flow>
            {/* Header actions */}
            <Flow direction="row">
              <Flow direction="row" gap={4}>
                <IconButton />
                <IconButton />
              </Flow>
            </Flow>
          </>
        )}
      footer={(
          <>
            {/* Left footer actions */}
            <Flow direction="row">
              <Flow direction="row" gap={8}>
                <Button count="9">Доп.кнопка</Button>
                <Button count="9">Доп.кнопка</Button>
                <Button />
              </Flow>
              <Checkbox />
            </Flow>
            {/* Right footer actions */}
            <Flow direction="row">
              <Button count="9">Назад</Button>
              <Button count="9">Далее</Button>
            </Flow>
          </>
        )}
    >
      <Flow direction="row">
        <Flow direction="column" gap={8}>
          <Combobox label="Этап оплаты" value="Постоплата" />
        </Flow>
        <Divider />
        <Flow direction="row" gap={12}>
          <TextField label="Получатель платежа (наименование для платёжного поручения)" value="ОАО Раменский приборостроительный завод" />
        </Flow>
        <Flow direction="row" gap={24}>
          <Combobox label="Расчётный счёт" value="Выберите значение" />
          <TextField label="Банк" value="ПАО Сбербанк" />
          <TextField label="БИК" value="044525225" />
        </Flow>
        <Flow direction="row" gap={24}>
          <TextField label="Корр.счёт" value="3010181020000000025" />
          <TextField label="Код УИН / УИП" placeholder="Введите значение" />
          <Combobox />
        </Flow>
        <Divider />
        <Flow direction="row" gap={24}>
          <Combobox label="КБК" value="Выберите значение" />
          <Combobox label="ОКТМО" value="Выберите значение" />
          <Combobox />
        </Flow>
        <Divider />
        <Flow direction="row" gap={24}>
          <TextField label="Сумма к оплате с НДС" value="402 800,00" />
          <TextField label="Сумма НДС" value="71 475,41" />
          <TextField label="Валюта платежа" value="RUB" />
        </Flow>
        <Flow direction="row" gap={8}>
          <DatePicker label="Планируемая дата платежа" value="20.02.2026" />
        </Flow>
      </Flow>
    </ModalDF>
  );
};
