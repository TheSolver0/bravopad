import MessengerWidget from '@/components/MessengerWidget';

export default function Messages() {
    return (
        <div className="flex flex-1 min-h-0 h-full p-4 md:p-5">
            <MessengerWidget variant="fullscreen" />
        </div>
    );
}
