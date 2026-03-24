using System.Media;
using System.Windows;
using System.Windows.Threading;

namespace AlarmClock;

public partial class MainWindow : Window
{
    private readonly DispatcherTimer _clockTimer = new();
    private TimeOnly? _alarmTime = null;
    private bool _alarmTriggered = false;

    public MainWindow()
    {
        InitializeComponent();
        _clockTimer.Interval = TimeSpan.FromSeconds(1);
        _clockTimer.Tick += ClockTimer_Tick;
        _clockTimer.Start();
        UpdateClock();
    }

    private void ClockTimer_Tick(object? sender, EventArgs e) => UpdateClock();

    private void UpdateClock()
    {
        var now = DateTime.Now;
        CurrentTimeText.Text = now.ToString("HH:mm:ss");
        CurrentDateText.Text = now.ToString("dddd, dd. MMMM yyyy",
            new System.Globalization.CultureInfo("de-DE"));

        if (_alarmTime.HasValue && !_alarmTriggered)
        {
            var current = TimeOnly.FromDateTime(now);
            if (current.Hour == _alarmTime.Value.Hour &&
                current.Minute == _alarmTime.Value.Minute &&
                current.Second == 0)
            {
                TriggerAlarm();
            }
        }
    }

    private void TriggerAlarm()
    {
        _alarmTriggered = true;
        StatusText.Text = "🔔 WECKER KLINGELT!";
        StatusText.Foreground = System.Windows.Media.Brushes.OrangeRed;
        StopAlarmButton.IsEnabled = true;
        SystemSounds.Exclamation.Play();
        MessageBox.Show("⏰ Wecker! Zeit aufzustehen!", "Weckuhr", MessageBoxButton.OK, MessageBoxImage.Information);
    }

    private void SetAlarmButton_Click(object sender, RoutedEventArgs e)
    {
        if (TimeOnly.TryParse(AlarmTimePicker.Text, out var time))
        {
            _alarmTime = time;
            _alarmTriggered = false;
            StatusText.Text = $"✅ Alarm gesetzt für {time:HH:mm} Uhr";
            StatusText.Foreground = System.Windows.Media.Brushes.LightGreen;
            StopAlarmButton.IsEnabled = true;
        }
        else
        {
            MessageBox.Show("Bitte gib eine gültige Uhrzeit ein (z. B. 07:30)", "Ungültige Eingabe",
                MessageBoxButton.OK, MessageBoxImage.Warning);
        }
    }

    private void StopAlarmButton_Click(object sender, RoutedEventArgs e)
    {
        _alarmTime = null;
        _alarmTriggered = false;
        AlarmTimePicker.Text = "07:00";
        StatusText.Text = "Kein Alarm gesetzt";
        StatusText.Foreground = System.Windows.Media.Brushes.LightGreen;
        StopAlarmButton.IsEnabled = false;
    }
}