import useEmblaCarousel from 'embla-carousel-react'
import type { EmblaOptionsType } from 'embla-carousel'
import type { AppData } from '../db/hooks'
import { HomeScreen } from '../screens/HomeScreen'
import { WeekScreen } from '../screens/WeekScreen'

// Константа вне компонента: новый объект настроек на каждый рендер заставлял бы карусель пересоздаваться.
const EMBLA_OPTIONS: EmblaOptionsType = {
  loop: false,
  // Свайп по строке задачи — действие над задачей, а не переключение экранов.
  watchDrag: (_api, event) => !(event.target instanceof Element && event.target.closest('[data-no-embla]')),
}

export function AppShell({ data }: { data: AppData | undefined }) {
  const [emblaRef] = useEmblaCarousel(EMBLA_OPTIONS)

  return (
    <div className="px-safe fixed inset-0 flex flex-col bg-bg text-fg">
      <div
        ref={emblaRef}
        className="min-h-0 flex-1 overflow-hidden"
        // Экраны двигает только карусель (transform). Если браузер сам прокрутил контейнер,
        // например подводя фокус к элементу на соседнем экране, возвращаем его на место.
        onScroll={(e) => {
          if (e.currentTarget.scrollLeft !== 0) e.currentTarget.scrollLeft = 0
        }}
      >
        <div className="embla__container flex h-full">
          <section className="h-full min-w-0 flex-[0_0_100%]">
            <HomeScreen data={data} />
          </section>
          <section className="h-full min-w-0 flex-[0_0_100%]">
            <WeekScreen data={data} />
          </section>
        </div>
      </div>
    </div>
  )
}
