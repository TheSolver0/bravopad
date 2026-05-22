import MessengerWidget from '@/components/MessengerWidget';

export default function Messages() {
    return (
        <div className="mx-auto flex h-[calc(100vh-11rem)] min-h-[560px] max-w-7xl flex-col">
            <MessengerWidget variant="fullscreen" />
        </div>
    );
}
