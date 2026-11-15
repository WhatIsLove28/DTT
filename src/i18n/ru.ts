import { pluralRu } from './plural'

/** Русский словарь. Его форма задаёт тип Dict: в других языках должны быть те же ключи. */
export const ru = {
  /** Тег локали для Intl и атрибута lang */
  localeTag: 'ru-RU',

  common: {
    save: 'Сохранить',
    cancel: 'Отмена',
    delete: 'Удалить',
    done: 'Готово',
    close: 'Закрыть',
    back: 'Назад',
    today: 'Сегодня',
    name: 'Название',
    category: 'Категория',
    saveFailed: 'Не удалось сохранить',
    chooseCategory: 'Выберите категорию',
  },

  app: {
    name: 'Трекер',
    screensNav: 'Экраны',
    screens: ['Главный экран', 'Неделя'],
    version: (v: string) => `Трекер · версия ${v}`,
    newVersion: 'Доступна новая версия',
    update: 'Обновить',
    later: 'Позже',
  },

  /** Шаблоны дат для date-fns */
  datePatterns: {
    /** «воскресенье, 15 ноября» */
    weekdayDayMonth: 'EEEE, d MMMM',
    /** «вс, 15 ноября» */
    shortWeekdayDayMonth: 'EEEEEE, d MMMM',
    /** «15 ноября» */
    dayMonth: 'd MMMM',
    /** «15 нояб.» */
    dayShortMonth: 'd MMM',
    /** «вс» */
    weekdayShort: 'EEEEEE',
  },
  /** Диапазон дней внутри одного месяца: «9–15 ноября» */
  rangeInMonth: (startDay: string, endDay: string, month: string) => `${startDay}–${endDay} ${month}`,

  status: {
    overdue: 'Просрочена',
    todo: 'Не начата',
    inProgress: 'В процессе',
    done: 'Выполнена',
    skipped: 'Пропущена',
    goalAchieved: 'Норма выполнена',
    goalOnTrack: 'Идёт по плану',
    goalUnreachable: 'Норму уже не набрать',
    aria: (label: string) => `Статус: ${label}`,
  },

  task: {
    repeats: 'Повторяется',
    overdueBadge: 'Просрочено',
    since: (date: string) => `с ${date}`,
    markDone: 'Выполнено',
    releaseToDone: 'Отпустите — выполнено',
    skip: 'Пропустить',
  },

  home: {
    settings: 'Настройки',
    goals: 'Цели недели',
    addGoal: 'Добавить цель',
    noGoals: 'Целей на эту неделю нет. Нажмите «+», чтобы добавить первую.',
    plannedGoals: 'Запланированные цели',
    startsOn: (date: string) => `с ${date}`,
    addTask: 'Добавить задачу',
    noTasks: 'На сегодня задач нет.',
    goalTarget: (target: string) => `Цель: ${target}`,
  },

  week: {
    modeWeek: 'Неделя',
    modeDay: 'День',
    pickDate: 'Выбрать дату',
    prevWeek: 'Предыдущая неделя',
    prevDay: 'Предыдущий день',
    nextWeek: 'Следующая неделя',
    nextDay: 'Следующий день',
    add: 'Добавить задачу или цель',
    noTasksPast: 'В этот день задач не было.',
    noTasks: 'На этот день задач нет.',
    untimed: 'Без времени',
  },

  sheets: {
    task: 'Задача',
    newTask: 'Новая задача',
    goal: 'Цель недели',
    newGoal: 'Новая цель',
    complete: 'Сколько заняло?',
    deleteTask: 'Удалить задачу?',
    calendar: 'Перейти к дате',
    addChoice: 'Что добавить?',
    deleteText: (title: string, kind: 'series' | 'goal' | 'manual') =>
      `«${title}»` +
      (kind === 'series'
        ? ' — повторяющаяся задача. Что удалить?'
        : kind === 'goal'
          ? ' — задача из недельной цели. Удалится только эта задача; сама цель останется.'
          : ' будет удалена без возможности восстановления.'),
    onlyThis: 'Только эту',
    thisAndFollowing: 'Эту и последующие',
    choiceTask: 'Задача',
    choiceTaskHint: 'Разовая или повторяющаяся, на выбранный день',
    choiceGoal: 'Цель на неделю',
    choiceGoalHint: 'Норма на неделю; начнётся с открытой недели',
  },

  taskEditor: {
    fromGoal: (title: string) => `из цели «${title}»`,
    repeat: (text: string) => `повтор: ${text}`,
    repeatOff: 'выключен',
    titlePlaceholder: 'Что нужно сделать',
    date: 'Дата',
    startingFrom: 'Начиная с',
    plannedDuration: 'Плановая длительность',
    startTime: 'Время начала',
    goalLink: 'Привязка к цели',
    goalLinkHint: 'Выполнение этой задачи увеличит прогресс цели.',
    noLink: 'Без привязки',
    autoRepeat: 'Автоповтор',
    hintRepeatEnds: 'Повтор закончится сегодня: будущие задачи удалятся, история сохранится.',
    hintSeriesChange: 'Изменения применятся к сегодняшней и будущим задачам серии.',
    noRepeat: 'Не повторять',
    add: 'Добавить задачу',
    reopen: 'Вернуть в работу',
    errTitle: 'Введите название задачи',
    errDate: 'Укажите дату',
  },

  goalEditor: {
    titlePlaceholder: 'Например, тренировка',
    startWeek: 'Начать с недели',
    startWeekHint: 'Цель и её задачи появятся с понедельника этой недели.',
    earlier: 'Раньше',
    later: 'Позже',
    thisWeek: (range: string) => `Эта неделя · ${range}`,
    nextWeek: (range: string) => `Следующая · ${range}`,
    schedule: 'Расписание',
    hintNone: 'Задачи не создаются сами: цель пополняют привязанные к ней задачи.',
    hintFromMonday: 'Отсчёт идёт от понедельника выбранной недели.',
    hintFromToday: 'Отсчёт идёт от сегодняшнего дня.',
    noSchedule: 'Без расписания',
    weeklyTarget: 'Цель на неделю',
    targetCount: 'Количество раз',
    targetPercent: 'Процент',
    norm: 'Норма',
    suffixPercent: '% запланированных задач',
    suffixCount: 'раз за неделю',
    defaultDuration: 'Длительность по умолчанию',
    defaultStartTime: 'Время начала по умолчанию',
    repeat: 'Повтор',
    hintEndsToday: 'Цель закончится сегодня: будущие задачи удалятся, история сохранится.',
    hintOnlySelectedWeek: 'Цель действует только выбранную неделю.',
    hintOnlyThisWeek: 'Цель действует только до конца этой недели.',
    repeatWeekly: 'Повторять каждую неделю',
    create: 'Создать цель',
    archive: 'В архив',
    archiveConfirm:
      'Цель пропадёт с главного экрана, её незавершённые задачи с сегодняшнего дня удалятся. История останется.',
    deleteConfirm: 'Цель и все её задачи, включая выполненные, будут удалены без возможности восстановления.',
    deleteForever: 'Удалить навсегда',
    errTitle: 'Введите название цели',
  },

  fields: {
    notSet: 'не задано',
    clear: 'Убрать',
    startTime: 'Время начала',
    duration: 'Длительность',
    durationInMinutes: 'Длительность в минутах',
    minutesSuffix: 'мин',
    durationExact: (text: string) => `Длительность: ${text}. Ввести точное значение`,
    /** Подпись деления линейки: «1 ч» */
    rulerHours: (h: number) => `${h} ч`,
  },

  recurrence: {
    daily: 'Каждый день',
    everyNDays: 'Раз в N дней',
    weekdays: 'По дням недели',
    timesPerWeek: 'N раз в неделю',
    /** Кнопки дней недели, пн–вс */
    weekdayButtons: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    every: 'Каждые',
    intervalLabel: 'Интервал в днях',
    intervalSuffix: 'дн. (2 — через день)',
    timesLabel: 'Раз в неделю',
    timesSuffix: 'раз в неделю, в любые дни',
    hintFlexible: 'Задача видна каждый день, пока недельная норма не выполнена.',
    // Короткое описание правила
    textNone: 'без повтора',
    textDaily: 'каждый день',
    textEveryOther: 'через день',
    textEveryN: (n: number) => `каждые ${n} ${pluralRu(n, ['день', 'дня', 'дней'])}`,
    /** Дни недели в описании, пн–вс */
    textWeekdays: ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'],
    textTimesPerWeek: (n: number) => `${n} ${pluralRu(n, ['раз', 'раза', 'раз'])} в неделю`,
    errWeekdays: 'Выберите хотя бы один день недели',
    errInterval: 'Укажите интервал в днях',
    errTimes: 'Укажите от 1 до 7 раз в неделю',
  },

  duration: (h: number, m: number) => (h === 0 ? `${m} мин` : m === 0 ? `${h} ч` : `${h} ч ${m} мин`),

  settings: {
    title: 'Настройки',
    categories: 'Категории',
    addCategory: 'Добавить категорию',
    categoryTitle: 'Категория',
    newCategory: 'Новая категория',
    namePlaceholder: 'Например, здоровье',
    color: 'Цвет',
    colorAria: (c: string) => `Цвет ${c}`,
    errName: 'Введите название категории',
    errDuplicate: 'Категория с таким названием уже есть',
    errDelete: 'Не удалось удалить категорию',
    cantDeleteOnly: 'Единственную категорию удалить нельзя',
    deleteCategory: 'Удалить категорию',
    usage: (n: number) =>
      `В категории ${n} ${pluralRu(n, ['запись', 'записи', 'записей'])} (задачи, цели, серии). Куда их перенести?`,
    usageEmpty: 'В категории ничего нет. На всякий случай выберите, куда перенести записи.',
    moveTo: 'Перенести в категорию',
    errMoveToSame: 'Нельзя перенести задачи в удаляемую категорию',
    errMoveToMissing: 'Категория для переноса не найдена',
    appearance: 'Оформление',
    themeSystem: 'Системная',
    themeLight: 'Светлая',
    themeDark: 'Тёмная',
    language: 'Язык',
    languageAuto: 'Авто',
    /** Категории, которые создаются при первом запуске */
    defaultCategories: ['Работа', 'Спорт', 'Учёба', 'Дом'],
  },

  backup: {
    title: 'Резервная копия',
    never: 'Бэкап ещё ни разу не делали.',
    today: 'Последний бэкап: сегодня.',
    daysAgo: (n: number) => `Последний бэкап: ${n} ${pluralRu(n, ['день', 'дня', 'дней'])} назад.`,
    info: 'Данные хранятся только на этом устройстве. Если удалить иконку с экрана «Домой», они сотрутся — делайте бэкап хотя бы раз в неделю.',
    export: 'Экспорт',
    import: 'Импорт',
    saved: (name: string) => `Бэкап сохранён: ${name}`,
    exportFailed: 'Не удалось сделать бэкап',
    badFile: 'Файл не подходит',
    restored: 'Данные восстановлены из бэкапа.',
    restoreFailed: 'Не удалось восстановить данные',
    persisted: 'Хранилище защищено от автоматической очистки.',
    notPersisted: 'Система может очистить хранилище при нехватке места — ещё одна причина делать бэкап.',
    restoreTitle: 'Восстановить из бэкапа?',
    summary: (date: string | undefined, tasks: number, goals: number, categories: number) =>
      `В файле${date ? ` от ${date}` : ''}: ${tasks} ${pluralRu(tasks, ['задача', 'задачи', 'задач'])}, ` +
      `${goals} ${pluralRu(goals, ['цель', 'цели', 'целей'])}, ` +
      `${categories} ${pluralRu(categories, ['категория', 'категории', 'категорий'])}.`,
    replaceWarning: 'Все текущие данные будут заменены содержимым файла. Отменить это нельзя.',
    replace: 'Заменить данные',
    errNoSection: (name: string) => `В файле нет раздела «${name}»`,
    errBrokenSection: (name: string) => `Раздел «${name}» повреждён`,
    errNotJson: 'Файл не читается: это не JSON',
    errNotBackup: 'Это не файл бэкапа трекера',
    errNewer: 'Бэкап сделан в более новой версии приложения',
    sectionTasks: 'задачи',
    sectionCategories: 'категории',
    sectionGoals: 'цели',
    sectionSeries: 'серии',
    sectionMeta: 'служебные данные',
  },
}

export type Dict = typeof ru
